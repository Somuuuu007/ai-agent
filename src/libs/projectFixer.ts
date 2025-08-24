import { promises as fs } from 'fs'
import path from 'path'

export interface ProjectFixResult {
  success: boolean
  fixes: string[]
  errors: string[]
  fixedFiles: string[]
}

export interface ExtractedFile {
  path: string
  content: string
}

export class ProjectFixer {
  private projectPath: string
  private projectId: string
  private fixes: string[] = []
  private errors: string[] = []
  private fixedFiles: string[] = []

  constructor(projectPath: string, projectId: string) {
    this.projectPath = projectPath
    this.projectId = projectId
  }

  async fixProject(): Promise<ProjectFixResult> {
    try {
      // Fix package.json dependencies
      await this.fixPackageJson()
      
      // Fix Tailwind configuration
      await this.fixTailwindConfig()
      
      // Fix import paths
      await this.fixImportPaths()
      
      // Fix index.css with proper Tailwind directives
      await this.fixIndexCSS()
      
      // Fix vite.config.ts for proper alias support
      await this.fixViteConfig()
      
      // Fix tsconfig.json for proper path mapping
      await this.fixTsConfig()

      return {
        success: true,
        fixes: this.fixes,
        errors: this.errors,
        fixedFiles: this.fixedFiles
      }
    } catch (error) {
      this.errors.push(`Project fixing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return {
        success: false,
        fixes: this.fixes,
        errors: this.errors,
        fixedFiles: this.fixedFiles
      }
    }
  }

  private async fixPackageJson() {
    const packageJsonPath = path.join(this.projectPath, 'package.json')
    
    try {
      const content = await fs.readFile(packageJsonPath, 'utf8')
      const packageJson = JSON.parse(content)

      // Ensure Tailwind dependencies (now default for all projects)
      packageJson.devDependencies = {
        ...packageJson.devDependencies,
        'tailwindcss': '^3.4.1',
        'postcss': '^8.4.35',
        'autoprefixer': '^10.4.17'
      }

      // Ensure proper React and Vite dependencies
      packageJson.dependencies = {
        'react': '^18.3.1',
        'react-dom': '^18.3.1',
        ...packageJson.dependencies
      }

      packageJson.devDependencies = {
        '@types/react': '^18.3.3',
        '@types/react-dom': '^18.3.0',
        '@typescript-eslint/eslint-plugin': '^7.2.0',
        '@typescript-eslint/parser': '^7.2.0',
        '@vitejs/plugin-react': '^4.2.1',
        'eslint': '^8.57.0',
        'eslint-plugin-react-hooks': '^4.6.0',
        'eslint-plugin-react-refresh': '^0.4.6',
        'typescript': '^5.2.2',
        'vite': '^5.2.0',
        ...packageJson.devDependencies
      }

      // Ensure proper scripts
      packageJson.scripts = {
        'dev': 'vite',
        'build': 'vite build',
        'preview': 'vite preview',
        'lint': 'eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0',
        ...packageJson.scripts
      }

      // Ensure type module
      packageJson.type = 'module'

      await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8')
      this.fixes.push('Fixed package.json dependencies and scripts')
      this.fixedFiles.push('package.json')
    } catch (error) {
      this.errors.push(`Failed to fix package.json: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async fixTailwindConfig() {
    // Always create Tailwind config since it's now the default tech stack

    const tailwindConfigPath = path.join(this.projectPath, 'tailwind.config.js')
    
    const tailwindConfig = `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',
        secondary: '#1E40AF',
        light: '#6B7280',
        dark: '#1F2937',
      },
      container: {
        center: true,
        padding: '1rem',
        screens: {
          sm: '640px',
          md: '768px',
          lg: '1024px',
          xl: '1280px',
        },
      },
    },
  },
  plugins: [],
}`

    try {
      await fs.writeFile(tailwindConfigPath, tailwindConfig, 'utf8')
      this.fixes.push('Created tailwind.config.js')
      this.fixedFiles.push('tailwind.config.js')
    } catch (error) {
      this.errors.push(`Failed to create Tailwind config: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // Create postcss.config.js
    const postcssConfigPath = path.join(this.projectPath, 'postcss.config.js')
    const postcssConfig = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`

    try {
      await fs.writeFile(postcssConfigPath, postcssConfig, 'utf8')
      this.fixes.push('Created postcss.config.js')
      this.fixedFiles.push('postcss.config.js')
    } catch (error) {
      this.errors.push(`Failed to create PostCSS config: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async fixImportPaths() {
    const srcPath = path.join(this.projectPath, 'src')
    
    try {
      await this.fixImportsInDirectory(srcPath)
    } catch (error) {
      this.errors.push(`Failed to fix import paths: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async fixImportsInDirectory(dirPath: string) {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)
      
      if (entry.isDirectory()) {
        await this.fixImportsInDirectory(fullPath)
      } else if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
        await this.fixImportsInFile(fullPath)
      }
    }
  }

  private async fixImportsInFile(filePath: string) {
    try {
      const content = await fs.readFile(filePath, 'utf8')
      let hasChanges = false
      
      // Fix relative imports to use @/ alias
      let fixedContent = content
        .replace(/from\s+['"]\.\.\/pages\/([^'"]+)['"]/g, "from '@/pages/$1'")
        .replace(/from\s+['"]\.\.\/components\/([^'"]+)['"]/g, "from '@/components/$1'")
        .replace(/from\s+['"]\.\.\/utils\/([^'"]+)['"]/g, "from '@/utils/$1'")
        .replace(/from\s+['"]\.\.\/libs\/([^'"]+)['"]/g, "from '@/libs/$1'")
        .replace(/from\s+['"]\.\/pages\/([^'"]+)['"]/g, "from '@/pages/$1'")
        .replace(/from\s+['"]\.\/components\/([^'"]+)['"]/g, "from '@/components/$1'")
        .replace(/from\s+['"]\.\/utils\/([^'"]+)['"]/g, "from '@/utils/$1'")
        .replace(/from\s+['"]\.\/libs\/([^'"]+)['"]/g, "from '@/libs/$1'")

      if (fixedContent !== content) {
        await fs.writeFile(filePath, fixedContent, 'utf8')
        hasChanges = true
      }

      if (hasChanges) {
        const relativePath = path.relative(this.projectPath, filePath)
        this.fixes.push(`Fixed imports in ${relativePath}`)
        this.fixedFiles.push(relativePath)
      }
    } catch (error) {
      const relativePath = path.relative(this.projectPath, filePath)
      this.errors.push(`Failed to fix imports in ${relativePath}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async fixIndexCSS() {
    const indexCssPath = path.join(this.projectPath, 'src', 'index.css')
    
    // Always use Tailwind CSS as the default
    let cssContent = `@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom base styles */
@layer base {
  body {
    @apply font-sans;
  }
}

/* Custom component styles */
@layer components {
  .container {
    @apply max-w-7xl mx-auto px-4 sm:px-6 lg:px-8;
  }
  
  .btn {
    @apply px-6 py-3 rounded-lg font-medium text-center transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2;
  }
  
  .btn:not(.btn-secondary) {
    @apply bg-primary text-white hover:bg-blue-600 focus:ring-primary;
  }
  
  .btn-secondary {
    @apply bg-transparent text-primary border-2 border-primary hover:bg-primary hover:text-white focus:ring-primary;
  }
}

/* Custom utility styles */
@layer utilities {
  .text-primary {
    @apply text-blue-500;
  }
  
  .text-light {
    @apply text-gray-600;
  }
  
  .bg-primary {
    @apply bg-blue-500;
  }
}
`

    try {
      await fs.writeFile(indexCssPath, cssContent, 'utf8')
      this.fixes.push('Fixed src/index.css with proper styles')
      this.fixedFiles.push('src/index.css')
    } catch (error) {
      this.errors.push(`Failed to fix index.css: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async fixViteConfig() {
    const viteConfigPath = path.join(this.projectPath, 'vite.config.ts')
    
    const viteConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})`

    try {
      await fs.writeFile(viteConfigPath, viteConfig, 'utf8')
      this.fixes.push('Fixed vite.config.ts')
      this.fixedFiles.push('vite.config.ts')
    } catch (error) {
      this.errors.push(`Failed to fix vite.config.ts: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async fixTsConfig() {
    const tsConfigPath = path.join(this.projectPath, 'tsconfig.json')
    
    const tsConfig = {
      compilerOptions: {
        target: "ES2020",
        useDefineForClassFields: true,
        lib: ["ES2020", "DOM", "DOM.Iterable"],
        module: "ESNext",
        skipLibCheck: true,
        moduleResolution: "bundler",
        allowImportingTsExtensions: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: "react-jsx",
        strict: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noFallthroughCasesInSwitch: true,
        paths: {
          "@/*": ["./src/*"]
        }
      },
      include: ["src"],
      references: []
    }

    try {
      await fs.writeFile(tsConfigPath, JSON.stringify(tsConfig, null, 2), 'utf8')
      this.fixes.push('Fixed tsconfig.json')
      this.fixedFiles.push('tsconfig.json')
    } catch (error) {
      this.errors.push(`Failed to fix tsconfig.json: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private usesTailwind(): boolean {
    // Since Tailwind is now the default, assume true unless explicitly using regular CSS
    try {
      const packageJsonPath = path.join(this.projectPath, 'package.json')
      const packageContent = require(packageJsonPath)
      
      // Check if Tailwind is explicitly in dependencies
      const hasTailwindDep = !!(
        packageContent.dependencies?.tailwindcss ||
        packageContent.devDependencies?.tailwindcss ||
        packageContent.dependencies?.['tailwindcss'] ||
        packageContent.devDependencies?.['tailwindcss']
      )
      
      if (hasTailwindDep) return true
      
      // Check if there are Tailwind classes in source files (fallback check)
      const srcPath = path.join(this.projectPath, 'src')
      if (this.hasTailwindClassesInDirectory(srcPath)) {
        return true
      }
      
      // Default to true since Tailwind is now the default tech stack
      return true
    } catch {
      // Default to true since Tailwind is now the default tech stack
      return true
    }
  }
  
  private hasTailwindClassesInDirectory(dirPath: string): boolean {
    try {
      const fs = require('fs')
      const entries = fs.readdirSync(dirPath, { withFileTypes: true })
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name)
        
        if (entry.isDirectory()) {
          if (this.hasTailwindClassesInDirectory(fullPath)) {
            return true
          }
        } else if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
          const content = fs.readFileSync(fullPath, 'utf8')
          // Look for common Tailwind classes
          if (/className\s*=\s*["'][^"']*\b(bg-|text-|flex|grid|p-|m-|w-|h-|border|rounded)\b[^"']*["']/.test(content)) {
            return true
          }
        }
      }
      
      return false
    } catch {
      return false
    }
  }
}

export const fixProject = async (projectPath: string, projectId: string): Promise<ProjectFixResult> => {
  const fixer = new ProjectFixer(projectPath, projectId)
  return await fixer.fixProject()
}