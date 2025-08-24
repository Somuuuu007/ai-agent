import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { fixProject } from '@/libs/projectFixer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  fixes: string[]
  fixedFiles: string[]
}

export async function POST(req: NextRequest) {
  try {
    const { projectId } = await req.json()

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
    }

    const projectPath = process.platform === 'win32' 
      ? path.join(process.cwd(), 'ai-previews', projectId)
      : path.join('/srv', 'ai-previews', projectId)

    try {
      await fs.access(projectPath)
    } catch {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const result = await validateAndFixProject(projectPath)

    return NextResponse.json({
      success: true,
      projectId,
      validation: result
    })

  } catch (error) {
    console.error('Project validation error:', error)
    return NextResponse.json({ 
      error: 'Validation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function validateAndFixProject(projectPath: string): Promise<ValidationResult> {
  // Use our robust ProjectFixer
  const projectId = path.basename(projectPath)
  const fixResult = await fixProject(projectPath, projectId)
  
  const result: ValidationResult = {
    isValid: fixResult.success,
    errors: fixResult.errors,
    warnings: [], // Our fixer doesn't generate warnings currently
    fixes: fixResult.fixes,
    fixedFiles: fixResult.fixedFiles
  }

  // Additional legacy validations for backwards compatibility
  await validateAdditionalIssues(projectPath, result)

  result.isValid = result.errors.length === 0

  return result
}

async function validateAdditionalIssues(projectPath: string, result: ValidationResult) {
  // Additional validation checks can be added here in the future
  // For now, our ProjectFixer handles most common issues
  try {
    // Check if essential files exist
    const essentialFiles = ['package.json', 'src/main.tsx', 'index.html', 'vite.config.ts']
    
    for (const file of essentialFiles) {
      const filePath = path.join(projectPath, file)
      try {
        await fs.access(filePath)
      } catch {
        result.warnings.push(`Missing essential file: ${file}`)
      }
    }
  } catch (error) {
    result.errors.push(`Additional validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Legacy validation function - keeping for backwards compatibility but simplified
async function validatePackageJson(projectPath: string, result: ValidationResult) {
  const packageJsonPath = path.join(projectPath, 'package.json')
  
  try {
    const content = await fs.readFile(packageJsonPath, 'utf8')
    const packageJson = JSON.parse(content)
    
    // Fix React version compatibility first
    let packageJsonUpdated = false
    
    // Ensure compatible React versions with Next.js 15
    if (packageJson.dependencies?.react === '19.0.0' || packageJson.dependencies?.['react-dom'] === '19.0.0') {
      packageJson.dependencies.react = '^18.2.0'
      packageJson.dependencies['react-dom'] = '^18.2.0'
      packageJsonUpdated = true
      result.fixes.push('Fixed React version compatibility (React 19 -> React 18 for Next.js 15 compatibility)')
    }
    
    // Ensure compatible Next.js and React versions  
    if (packageJson.dependencies?.next === '15.0.0' && packageJson.dependencies?.react !== '^18.2.0') {
      packageJson.dependencies.react = '^18.2.0'
      packageJson.dependencies['react-dom'] = '^18.2.0'
      packageJsonUpdated = true
      result.fixes.push('Updated React versions for Next.js 15 compatibility')
    }

    // Fix @types/react versions
    if (packageJson.devDependencies?.['@types/react'] === '19.0.0' || packageJson.devDependencies?.['@types/react-dom'] === '19.0.0' ||
        packageJson.devDependencies?.['@types/react'] === '^19.0.0' || packageJson.devDependencies?.['@types/react-dom'] === '^19.0.0') {
      packageJson.devDependencies['@types/react'] = '^18.2.0'
      packageJson.devDependencies['@types/react-dom'] = '^18.2.0'
      packageJsonUpdated = true
      result.fixes.push('Fixed @types/react version compatibility')
    }

    // Remove duplicate dependencies (packages that exist in both dependencies and devDependencies)
    const duplicates = []
    if (packageJson.dependencies && packageJson.devDependencies) {
      for (const dep in packageJson.dependencies) {
        if (packageJson.devDependencies[dep]) {
          // Keep it in devDependencies for build tools, remove from dependencies
          if (['tailwindcss', 'autoprefixer', 'postcss', 'typescript', '@types/node', '@types/react', '@types/react-dom'].includes(dep)) {
            delete packageJson.dependencies[dep]
            duplicates.push(dep)
          } else {
            // For other packages, keep in dependencies, remove from devDependencies
            delete packageJson.devDependencies[dep]
            duplicates.push(dep)
          }
        }
      }
    }

    if (duplicates.length > 0) {
      packageJsonUpdated = true
      result.fixes.push(`Removed ${duplicates.length} duplicate dependencies: ${duplicates.join(', ')}`)
    }

    // Move build tools to devDependencies
    const buildTools = ['tailwindcss', 'autoprefixer', 'postcss']
    for (const tool of buildTools) {
      if (packageJson.dependencies?.[tool]) {
        packageJson.devDependencies = packageJson.devDependencies || {}
        packageJson.devDependencies[tool] = packageJson.dependencies[tool]
        delete packageJson.dependencies[tool]
        packageJsonUpdated = true
        result.fixes.push(`Moved ${tool} to devDependencies`)
      }
    }

    if (packageJsonUpdated) {
      await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8')
      result.fixedFiles.push('package.json')
    }

    // Check for common missing dependencies
    const allFiles = await getAllProjectFiles(projectPath)
    const allFileContents = await Promise.all(
      allFiles.map(async (file) => ({
        path: file,
        content: await fs.readFile(file, 'utf8').catch(() => '')
      }))
    )
    
    const allContent = allFileContents.map(f => f.content).join('\n')
    const missingDeps = []

    // Check for common dependencies
    const dependencyChecks = [
      { pattern: /@heroicons\/react/, name: '@heroicons/react', version: '^2.0.0' },
      { pattern: /clsx\(/, name: 'clsx', version: '^2.0.0' },
      { pattern: /@tailwindcss/, name: 'tailwindcss', version: '^3.3.0', dev: true },
      { pattern: /autoprefixer/, name: 'autoprefixer', version: '^10.4.0', dev: true },
      { pattern: /postcss/, name: 'postcss', version: '^8.4.0', dev: true },
      { pattern: /lucide-react/, name: 'lucide-react', version: '^0.400.0' },
      { pattern: /react-hot-toast/, name: 'react-hot-toast', version: '^2.4.0' },
      { pattern: /zustand/, name: 'zustand', version: '^4.4.0' }
    ]

    for (const check of dependencyChecks) {
      if (check.pattern.test(allContent)) {
        const deps = check.dev ? packageJson.devDependencies : packageJson.dependencies
        if (!deps || !deps[check.name]) {
          missingDeps.push(check)
        }
      }
    }

    if (missingDeps.length > 0) {
      // Fix package.json by adding missing dependencies
      for (const dep of missingDeps) {
        if (dep.dev) {
          packageJson.devDependencies = packageJson.devDependencies || {}
          packageJson.devDependencies[dep.name] = dep.version
        } else {
          packageJson.dependencies = packageJson.dependencies || {}
          packageJson.dependencies[dep.name] = dep.version
        }
      }

      await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8')
      result.fixes.push(`Added ${missingDeps.length} missing dependencies to package.json`)
      result.fixedFiles.push('package.json')
    }

    // Ensure scripts are present
    const requiredScripts = {
      dev: 'next dev',
      build: 'next build',
      start: 'next start',
      lint: 'next lint'
    }

    let scriptsFixed = false
    for (const [script, command] of Object.entries(requiredScripts)) {
      if (!packageJson.scripts || !packageJson.scripts[script]) {
        packageJson.scripts = packageJson.scripts || {}
        packageJson.scripts[script] = command
        scriptsFixed = true
      }
    }

    if (scriptsFixed) {
      await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8')
      result.fixes.push('Added missing scripts to package.json')
      if (!result.fixedFiles.includes('package.json')) {
        result.fixedFiles.push('package.json')
      }
    }

  } catch (error) {
    result.errors.push(`Failed to validate package.json: ${error}`)
  }
}

async function validateFileImports(projectPath: string, result: ValidationResult) {
  const allFiles = await getAllProjectFiles(projectPath)
  
  for (const filePath of allFiles) {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) continue

    try {
      const originalContent = await fs.readFile(filePath, 'utf8')
      const relativePath = path.relative(projectPath, filePath)
      
      // Check for common import issues
      const importMatches = originalContent.match(/import.*from\s+['"]([^'"]+)['"]/g) || []
      
      // First, fix any import paths that incorrectly have file extensions
      let needsExtensionFix = false
      let updatedContent = originalContent
      
      for (const importLine of importMatches) {
        const match = importLine.match(/from\s+['"]([^'"]+)['"]/)
        if (!match) continue
        
        const importPath = match[1]
        // Remove .ts/.tsx extensions from @/ imports (they shouldn't have extensions)
        if (importPath.startsWith('@/') && /\.(ts|tsx|js|jsx)$/.test(importPath)) {
          const cleanPath = importPath.replace(/\.(ts|tsx|js|jsx)$/, '')
          updatedContent = updatedContent.replace(
            new RegExp(`from\\s+['"]${importPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`),
            `from '${cleanPath}'`
          )
          needsExtensionFix = true
          result.fixes.push(`Removed file extension from import in ${relativePath}: ${importPath} -> ${cleanPath}`)
        }
      }
      
      let currentContent = updatedContent
      if (needsExtensionFix) {
        await fs.writeFile(filePath, updatedContent, 'utf8')
        result.fixedFiles.push(relativePath)
        currentContent = updatedContent // Update content for further processing
      }
      
      for (const importLine of importMatches) {
        const match = importLine.match(/from\s+['"]([^'"]+)['"]/)
        if (!match) continue
        
        const importPath = match[1]
        
        // Check for file path imports that might not exist or need fixing
        if (importPath.startsWith('.') || importPath.startsWith('@/')) {
          // First try to convert relative paths to @/ paths
          if (importPath.startsWith('../components/') || importPath.startsWith('./components/')) {
            const componentName = importPath.split('/').pop()
            const newImportPath = `@/components/${componentName}`
            const newContent = currentContent.replace(
              new RegExp(`from\\s+['"]${importPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`),
              `from '${newImportPath}'`
            )
            if (newContent !== currentContent) {
              await fs.writeFile(filePath, newContent, 'utf8')
              result.fixes.push(`Fixed import path in ${relativePath}: ${importPath} -> ${newImportPath}`)
              result.fixedFiles.push(relativePath)
              continue
            }
          }

          const resolvedPath = resolveImportPath(filePath, importPath, projectPath)
          
          if (resolvedPath && !(await fileExists(resolvedPath))) {
            // Try to fix common naming issues
            const fixes = await tryFixImportPath(filePath, importPath, projectPath, currentContent)
            if (fixes.newContent) {
              await fs.writeFile(filePath, fixes.newContent, 'utf8')
              result.fixes.push(`Fixed import path in ${relativePath}: ${importPath} -> ${fixes.newPath}`)
              result.fixedFiles.push(relativePath)
            } else {
              result.errors.push(`Missing import file in ${relativePath}: ${importPath}`)
            }
          }
        }
      }
      
    } catch (error) {
      result.warnings.push(`Could not validate imports in ${path.relative(projectPath, filePath)}`)
    }
  }
}

async function validateClientComponents(projectPath: string, result: ValidationResult) {
  const allFiles = await getAllProjectFiles(projectPath)
  
  for (const filePath of allFiles) {
    if (!filePath.endsWith('.tsx')) continue

    try {
      const content = await fs.readFile(filePath, 'utf8')
      const relativePath = path.relative(projectPath, filePath)
      
      // Check if component uses client-only features but lacks 'use client'
      const usesClientFeatures = /use(State|Effect|Context|Callback|Memo|Reducer|Ref|Layout|LocalStorage|SearchParams|Router|Pathname)/.test(content) ||
                                /localStorage|sessionStorage|window|document|addEventListener/.test(content) ||
                                /onClick|onChange|onSubmit|onFocus|onBlur/.test(content)

      const hasUseClient = content.includes("'use client'") || content.includes('"use client"')

      if (usesClientFeatures && !hasUseClient && !relativePath.includes('/api/')) {
        // Add 'use client' directive
        const newContent = "'use client';\n" + content
        await fs.writeFile(filePath, newContent, 'utf8')
        result.fixes.push(`Added 'use client' directive to ${relativePath}`)
        result.fixedFiles.push(relativePath)
      }

    } catch (error) {
      result.warnings.push(`Could not validate client component: ${path.relative(projectPath, filePath)}`)
    }
  }
}

async function validateConfigFiles(projectPath: string, result: ValidationResult) {
  // Check for required App Router layout.tsx
  const layoutPath = path.join(projectPath, 'app', 'layout.tsx')
  if (!(await fileExists(layoutPath))) {
    const layoutContent = `import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Generated App',
  description: 'Generated by AI Agent',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}`
    await fs.mkdir(path.dirname(layoutPath), { recursive: true })
    await fs.writeFile(layoutPath, layoutContent, 'utf8')
    result.fixes.push('Created missing app/layout.tsx (required for Next.js App Router)')
    result.fixedFiles.push('app/layout.tsx')
  }

  // Check for required config files and create them if missing
  const requiredConfigs = [
    {
      name: 'next.config.js',
      content: `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = nextConfig;`
    },
    {
      name: 'tsconfig.json',
      content: `{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}`
    }
  ]

  for (const config of requiredConfigs) {
    const configPath = path.join(projectPath, config.name)
    if (!(await fileExists(configPath))) {
      await fs.writeFile(configPath, config.content, 'utf8')
      result.fixes.push(`Created missing ${config.name}`)
      result.fixedFiles.push(config.name)
    }
  }

  // Fix existing tsconfig.json with incorrect path mappings
  const tsconfigPath = path.join(projectPath, 'tsconfig.json')
  if (await fileExists(tsconfigPath)) {
    try {
      const tsconfigContent = await fs.readFile(tsconfigPath, 'utf8')
      const tsconfig = JSON.parse(tsconfigContent)
      
      // Check if paths has specific mappings instead of universal @/* mapping
      if (tsconfig.compilerOptions?.paths) {
        const paths = tsconfig.compilerOptions.paths
        const hasSpecificMappings = Object.keys(paths).some(key => 
          key.includes('@/components/*') || key.includes('@/hooks/*') || 
          key.includes('@/utils/*') || key.includes('@/app/*') || key.includes('@/lib/*')
        )
        
        if (hasSpecificMappings || !paths['@/*']) {
          // Replace with universal mapping
          tsconfig.compilerOptions.paths = {
            "@/*": ["./*"]
          }
          
          await fs.writeFile(tsconfigPath, JSON.stringify(tsconfig, null, 2), 'utf8')
          result.fixes.push('Fixed tsconfig.json path mappings to use universal "@/*": ["./*"]')
          result.fixedFiles.push('tsconfig.json')
        }
      }
    } catch (error) {
      result.warnings.push('Could not parse tsconfig.json for path mapping validation')
    }
  }

  // Check if Tailwind is used and validate setup
  const packageJsonPath = path.join(projectPath, 'package.json')
  let hasTailwindDependency = false
  let usesTailwind = false
  
  try {
    const packageContent = await fs.readFile(packageJsonPath, 'utf8')
    const packageJson = JSON.parse(packageContent)
    hasTailwindDependency = !!(packageJson.devDependencies?.tailwindcss || packageJson.dependencies?.tailwindcss)
  } catch {}
  
  const allFiles = await getAllProjectFiles(projectPath)
  
  for (const filePath of allFiles) {
    try {
      const content = await fs.readFile(filePath, 'utf8')
      if (content.includes('@tailwind') || content.includes('className=')) {
        usesTailwind = true
        break
      }
    } catch {}
  }
  
  // Fix globals.css if it has @tailwind directives but no Tailwind dependency
  const globalsCssPath = path.join(projectPath, 'app', 'globals.css')
  if (await fileExists(globalsCssPath)) {
    try {
      const globalsContent = await fs.readFile(globalsCssPath, 'utf8')
      if (globalsContent.includes('@tailwind') && !hasTailwindDependency) {
        // Replace @tailwind directives with basic CSS
        const basicCss = `/* Global styles */
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

/* Add your global styles here */`
        await fs.writeFile(globalsCssPath, basicCss, 'utf8')
        result.fixes.push('Removed @tailwind directives from globals.css (Tailwind not installed)')
        result.fixedFiles.push('app/globals.css')
      }
    } catch (error) {
      result.warnings.push('Could not validate globals.css content')
    }
  }

  if (usesTailwind && hasTailwindDependency) {
    const tailwindConfigPath = path.join(projectPath, 'tailwind.config.js')
    if (!(await fileExists(tailwindConfigPath))) {
      const tailwindConfig = `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`
      await fs.writeFile(tailwindConfigPath, tailwindConfig, 'utf8')
      result.fixes.push('Created missing tailwind.config.js')
      result.fixedFiles.push('tailwind.config.js')
    }

    const postcssConfigPath = path.join(projectPath, 'postcss.config.js')
    if (!(await fileExists(postcssConfigPath))) {
      const postcssConfig = `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`
      await fs.writeFile(postcssConfigPath, postcssConfig, 'utf8')
      result.fixes.push('Created missing postcss.config.js')
      result.fixedFiles.push('postcss.config.js')
    }
  } else {
    // Remove Tailwind config files if Tailwind is not actually used
    const tailwindConfigPath = path.join(projectPath, 'tailwind.config.js')
    const postcssConfigPath = path.join(projectPath, 'postcss.config.js')
    
    if (await fileExists(tailwindConfigPath) && !hasTailwindDependency) {
      await fs.unlink(tailwindConfigPath)
      result.fixes.push('Removed tailwind.config.js (Tailwind not installed)')
      result.fixedFiles.push('tailwind.config.js (removed)')
    }
    
    if (await fileExists(postcssConfigPath) && !hasTailwindDependency) {
      await fs.unlink(postcssConfigPath)
      result.fixes.push('Removed postcss.config.js (Tailwind not installed)')
      result.fixedFiles.push('postcss.config.js (removed)')
    }
  }
}

async function removeConflictingFiles(projectPath: string, result: ValidationResult) {
  // Detect if this is a Vite project
  const viteConfigPath = path.join(projectPath, 'vite.config.ts')
  const isViteProject = await fileExists(viteConfigPath)
  
  if (isViteProject) {
    // Remove Next.js specific files that conflict with Vite
    const nextJsFiles = [
      'next.config.js',
      'next-env.d.ts',
      'app/layout.tsx',
      'app/page.tsx',
      'app/globals.css'
    ]
    
    for (const filePath of nextJsFiles) {
      const fullPath = path.join(projectPath, filePath)
      if (await fileExists(fullPath)) {
        await fs.unlink(fullPath)
        result.fixes.push(`Removed conflicting Next.js file: ${filePath}`)
        result.fixedFiles.push(`${filePath} (removed)`)
      }
    }
    
    // Remove empty app directory if it exists
    const appDir = path.join(projectPath, 'app')
    try {
      const appDirContents = await fs.readdir(appDir)
      if (appDirContents.length === 0) {
        await fs.rmdir(appDir)
        result.fixes.push('Removed empty app/ directory')
      }
    } catch (error) {
      // Directory doesn't exist or not empty, ignore
    }
    
    // Ensure src/index.css exists instead of app/globals.css
    const srcIndexCss = path.join(projectPath, 'src', 'index.css')
    if (!(await fileExists(srcIndexCss))) {
      await fs.mkdir(path.join(projectPath, 'src'), { recursive: true })
      
      // Check if this is a Tailwind project
      const packageJsonPath = path.join(projectPath, 'package.json')
      let hasTailwind = false
      try {
        const packageContent = await fs.readFile(packageJsonPath, 'utf8')
        const packageJson = JSON.parse(packageContent)
        hasTailwind = !!(packageJson.devDependencies?.tailwindcss || packageJson.dependencies?.tailwindcss)
      } catch {}
      
      const indexCssContent = hasTailwind 
        ? `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n/* Global styles go here */`
        : `/* Global styles */\n:root {\n  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;\n  line-height: 1.5;\n  font-weight: 400;\n}\n\nbody {\n  margin: 0;\n  display: flex;\n  place-items: center;\n  min-width: 320px;\n  min-height: 100vh;\n}\n\n/* Add your global styles here */`
      
      await fs.writeFile(srcIndexCss, indexCssContent, 'utf8')
      result.fixes.push('Created src/index.css for Vite project')
      result.fixedFiles.push('src/index.css')
    }
  }
}

async function validateFilePaths(projectPath: string, result: ValidationResult) {
  // Fix common file naming issues
  const commonFixes = [
    { from: 'global.css', to: 'app/globals.css' },
    { from: 'globals.css', to: 'app/globals.css' },
    { from: 'styles/globals.css', to: 'app/globals.css' },
    { from: 'styles/global.css', to: 'app/globals.css' }
  ]

  for (const fix of commonFixes) {
    const fromPath = path.join(projectPath, fix.from)
    const toPath = path.join(projectPath, fix.to)
    
    if (await fileExists(fromPath) && !(await fileExists(toPath))) {
      await fs.mkdir(path.dirname(toPath), { recursive: true })
      await fs.rename(fromPath, toPath)
      result.fixes.push(`Moved ${fix.from} to ${fix.to} (correct location for App Router)`)
      result.fixedFiles.push(fix.to)
      
      // Remove empty styles directory if it exists and is empty
      const stylesDir = path.join(projectPath, 'styles')
      try {
        const stylesDirContents = await fs.readdir(stylesDir)
        if (stylesDirContents.length === 0) {
          await fs.rmdir(stylesDir)
          result.fixes.push('Removed empty styles/ directory')
        }
      } catch (error) {
        // Directory doesn't exist or not empty, ignore
      }
    }
  }
}

// Helper functions
async function getAllProjectFiles(projectPath: string): Promise<string[]> {
  const files: string[] = []
  
  async function scan(dir: string) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
        
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          await scan(fullPath)
        } else {
          files.push(fullPath)
        }
      }
    } catch {}
  }
  
  await scan(projectPath)
  return files
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

function resolveImportPath(fromFile: string, importPath: string, projectRoot: string): string | null {
  if (importPath.startsWith('@/')) {
    return path.join(projectRoot, importPath.slice(2))
  }
  
  if (importPath.startsWith('./') || importPath.startsWith('../')) {
    return path.resolve(path.dirname(fromFile), importPath)
  }
  
  return null
}

async function tryFixImportPath(filePath: string, importPath: string, projectRoot: string, content: string) {
  // Try common file extensions and naming patterns
  const basePath = resolveImportPath(filePath, importPath, projectRoot)
  if (!basePath) return { newContent: null, newPath: null }

  const extensions = ['', '.ts', '.tsx', '.js', '.jsx']
  const variations = [
    basePath,
    basePath + '/index',
    basePath.replace(/\/([^/]+)$/, '/$1/$1'), // folder/file -> folder/file/file
  ]

  for (const variation of variations) {
    for (const ext of extensions) {
      const testPath = variation + ext
      if (await fileExists(testPath)) {
        // Only add extension if the original import didn't have one and we found the file with extension
        // In TypeScript/JavaScript, we generally DON'T include extensions in imports
        let newImportPath = importPath
        
        // If the variation includes a different structure (like index files), update the import path
        if (variation !== basePath) {
          // Handle cases like '@/lib/utils' -> '@/lib/utils/index'
          if (variation.endsWith('/index')) {
            newImportPath = importPath // Keep original, just verify it resolves
          } else {
            // Other variations might need path updates, but for now keep original
            newImportPath = importPath
          }
        }
        
        // Don't modify the import path - just verify it resolves correctly
        return { newContent: content, newPath: importPath }
      }
    }
  }

  return { newContent: null, newPath: null }
}