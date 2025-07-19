import path from "path";
import { promises as fs } from "fs";

async function getProjectInfo(projectPath: string) {
  try {
    const packageJsonPath = path.join(projectPath, 'package.json');
    let projectName = path.basename(projectPath);
    let hasPackageJson = false;
    let packageInfo: any = {};
    let monorepoInfo = await detectMonorepoType(projectPath);

    try {
      await fs.access(packageJsonPath);
      hasPackageJson = true;
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      projectName = packageJson.name || projectName;
      packageInfo = packageJson;
    } catch {
      console.error('Package json not found in current project!');
    }

    // Add framework detection for main project
    const deps = { ...packageInfo.dependencies, ...packageInfo.devDependencies };
    let framework = detectFramework(deps);
    
    // Check for TypeScript
    const hasTypeScript = !!(deps?.typescript || deps?.['@types/node']) || 
                         await checkTypeScriptConfig(projectPath);

    // Build the response text
    let responseText = `📁 **Project Information**\n\n`;
    responseText += `**Name:** ${projectName}\n`;
    responseText += `**Path:** ${projectPath}\n`;
    
    if (monorepoInfo.isMonorepo) {
      responseText += `**Type:** Monorepo 📦 (${monorepoInfo.tool})\n`;
      responseText += `**Package Manager:** ${monorepoInfo.packageManager}\n`;
    } else {
      responseText += `**Type:** Single Package\n`;
      responseText += `**Package Manager:** ${monorepoInfo.packageManager}\n`;
    }
    
    responseText += `**Framework:** ${framework}\n`;
    responseText += `**TypeScript:** ${hasTypeScript ? '✅' : '❌'}\n`;
    responseText += `**Has package.json:** ${hasPackageJson ? '✅' : '❌'}\n`;

    if (monorepoInfo.isMonorepo) {
      responseText += `\n🏗️ **Monorepo Structure:**\n`;
      responseText += `**Tool:** ${monorepoInfo.tool}\n`;
      responseText += `**Workspaces:** ${monorepoInfo.workspaces.length}\n`;
      
      if (monorepoInfo.subProjects.length > 0) {
        responseText += `\n📋 **Sub-Projects:**\n`;
        monorepoInfo.subProjects.slice(0, 10).forEach((project, index) => {
          responseText += `${index + 1}. **${project.name}** (${project.framework})\n`;
          responseText += `   📍 ${project.relativePath}\n`;
        });
        
        if (monorepoInfo.subProjects.length > 10) {
          responseText += `   ... and ${monorepoInfo.subProjects.length - 10} more\n`;
        }
      }
    }

    responseText += `\n✅ Frontend Tech Lead MCP server is working!\n`;
    responseText += `🔧 Ready to add more frontend tech lead tools!`;

    return {
      content: [
        {
          type: 'text',
          text: responseText
        }
      ]
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error getting project info: ${error instanceof Error ? error.message : 'Unknown error!'}`
        }
      ]
    }
  }
}

// Enhanced monorepo detection
async function detectMonorepoType(projectPath: string) {
  const result = {
    isMonorepo: false,
    tool: 'None',
    packageManager: 'Unknown',
    workspaces: [] as string[],
    subProjects: [] as any[]
  };

  // Check package manager first
  result.packageManager = await detectPackageManager(projectPath);

  // 1. Check for Lerna
  const lernaConfig = await checkLernaConfig(projectPath);
  if (lernaConfig.isLerna) {
    result.isMonorepo = true;
    result.tool = 'Lerna';
    result.workspaces = lernaConfig.packages;
    result.subProjects = await analyzeWorkspaces(projectPath, lernaConfig.packages);
    return result;
  }

  // 2. Check for Yarn Workspaces
  const yarnWorkspaces = await checkYarnWorkspaces(projectPath);
  if (yarnWorkspaces.isYarnWorkspace) {
    result.isMonorepo = true;
    result.tool = 'Yarn Workspaces';
    result.workspaces = yarnWorkspaces.workspaces;
    result.subProjects = await analyzeWorkspaces(projectPath, yarnWorkspaces.workspaces);
    return result;
  }

  // 3. Check for npm workspaces
  const npmWorkspaces = await checkNpmWorkspaces(projectPath);
  if (npmWorkspaces.isNpmWorkspace) {
    result.isMonorepo = true;
    result.tool = 'npm Workspaces';
    result.workspaces = npmWorkspaces.workspaces;
    result.subProjects = await analyzeWorkspaces(projectPath, npmWorkspaces.workspaces);
    return result;
  }

  // 4. Check for pnpm workspaces
  const pnpmWorkspaces = await checkPnpmWorkspaces(projectPath);
  if (pnpmWorkspaces.isPnpmWorkspace) {
    result.isMonorepo = true;
    result.tool = 'pnpm Workspaces';
    result.workspaces = pnpmWorkspaces.workspaces;
    result.subProjects = await analyzeWorkspaces(projectPath, pnpmWorkspaces.workspaces);
    return result;
  }

  // 5. Check for Nx
  const nxConfig = await checkNxConfig(projectPath);
  if (nxConfig.isNx) {
    result.isMonorepo = true;
    result.tool = 'Nx';
    result.workspaces = nxConfig.projects;
    result.subProjects = await analyzeNxProjects(projectPath, nxConfig.projects);
    return result;
  }

  // 6. Check for Rush
  const rushConfig = await checkRushConfig(projectPath);
  if (rushConfig.isRush) {
    result.isMonorepo = true;
    result.tool = 'Rush';
    result.workspaces = rushConfig.projects;
    result.subProjects = await analyzeWorkspaces(projectPath, rushConfig.projects);
    return result;
  }

  return result;
}

// Check for Lerna configuration
async function checkLernaConfig(projectPath: string) {
  try {
    const lernaJsonPath = path.join(projectPath, 'lerna.json');
    await fs.access(lernaJsonPath);
    
    const lernaConfig = JSON.parse(await fs.readFile(lernaJsonPath, 'utf-8'));
    
    return {
      isLerna: true,
      packages: lernaConfig.packages || ['packages/*']
    };
  } catch {
    return { isLerna: false, packages: [] };
  }
}

// Check for Yarn Workspaces
async function checkYarnWorkspaces(projectPath: string) {
  try {
    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    
    // Check if yarn.lock exists to confirm it's yarn workspaces
    const hasYarnLock = await checkYarnLock(projectPath);
    
    if (packageJson.workspaces && hasYarnLock) {
      const workspaces = Array.isArray(packageJson.workspaces) 
        ? packageJson.workspaces 
        : packageJson.workspaces.packages || [];
      
      return {
        isYarnWorkspace: true,
        workspaces
      };
    }
    
    return { isYarnWorkspace: false, workspaces: [] };
  } catch {
    return { isYarnWorkspace: false, workspaces: [] };
  }
}

// Check for npm workspaces
async function checkNpmWorkspaces(projectPath: string) {
  try {
    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    
    // Check if it's npm (not yarn) and has workspaces
    const hasYarnLock = await checkYarnLock(projectPath);
    const hasNpmLock = await checkNpmLock(projectPath);
    
    if (packageJson.workspaces && !hasYarnLock && hasNpmLock) {
      const workspaces = Array.isArray(packageJson.workspaces) 
        ? packageJson.workspaces 
        : packageJson.workspaces.packages || [];
      
      return {
        isNpmWorkspace: true,
        workspaces
      };
    }
    
    return { isNpmWorkspace: false, workspaces: [] };
  } catch {
    return { isNpmWorkspace: false, workspaces: [] };
  }
}

// Check for pnpm workspaces
async function checkPnpmWorkspaces(projectPath: string) {
  try {
    const pnpmWorkspaceYamlPath = path.join(projectPath, 'pnpm-workspace.yaml');
    await fs.access(pnpmWorkspaceYamlPath);
    
    const yamlContent = await fs.readFile(pnpmWorkspaceYamlPath, 'utf-8');
    // Simple YAML parsing for packages array
    const packagesMatch = yamlContent.match(/packages:\s*\n((?:\s*-\s*.+\n?)*)/);
    
    if (packagesMatch) {
      const packages = packagesMatch[1]
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('-'))
        .map(line => line.substring(1).trim().replace(/['"]/g, ''));
      
      return {
        isPnpmWorkspace: true,
        workspaces: packages
      };
    }
    
    return { isPnpmWorkspace: false, workspaces: [] };
  } catch {
    return { isPnpmWorkspace: false, workspaces: [] };
  }
}

// Check for Nx configuration
async function checkNxConfig(projectPath: string) {
  try {
    const nxJsonPath = path.join(projectPath, 'nx.json');
    await fs.access(nxJsonPath);
    
    const workspaceJsonPath = path.join(projectPath, 'workspace.json');
    let projects = [];
    
    try {
      await fs.access(workspaceJsonPath);
      const workspaceConfig = JSON.parse(await fs.readFile(workspaceJsonPath, 'utf-8'));
      projects = Object.values(workspaceConfig.projects || {}).map((p: any) => p.root);
    } catch {
      // Try project.json approach
      const appsDir = path.join(projectPath, 'apps');
      const libsDir = path.join(projectPath, 'libs');
      
      try {
        const apps = await fs.readdir(appsDir, { withFileTypes: true });
        projects.push(...apps.filter(d => d.isDirectory()).map(d => `apps/${d.name}`));
      } catch {}
      
      try {
        const libs = await fs.readdir(libsDir, { withFileTypes: true });
        projects.push(...libs.filter(d => d.isDirectory()).map(d => `libs/${d.name}`));
      } catch {}
    }
    
    return {
      isNx: true,
      projects
    };
  } catch {
    return { isNx: false, projects: [] };
  }
}

// Check for Rush configuration
async function checkRushConfig(projectPath: string) {
  try {
    const rushJsonPath = path.join(projectPath, 'rush.json');
    await fs.access(rushJsonPath);
    
    const rushConfig = JSON.parse(await fs.readFile(rushJsonPath, 'utf-8'));
    const projects = rushConfig.projects?.map((p: any) => p.projectFolder) || [];
    
    return {
      isRush: true,
      projects
    };
  } catch {
    return { isRush: false, projects: [] };
  }
}

// Helper function to detect package manager
async function detectPackageManager(projectPath: string): Promise<string> {
  try {
    await fs.access(path.join(projectPath, 'yarn.lock'));
    return 'Yarn';
  } catch {}
  
  try {
    await fs.access(path.join(projectPath, 'pnpm-lock.yaml'));
    return 'pnpm';
  } catch {}
  
  try {
    await fs.access(path.join(projectPath, 'package-lock.json'));
    return 'npm';
  } catch {}
  
  return 'Unknown';
}

// Helper to check if yarn.lock exists
async function checkYarnLock(projectPath: string): Promise<boolean> {
  try {
    await fs.access(path.join(projectPath, 'yarn.lock'));
    return true;
  } catch {
    return false;
  }
}

// Helper to check if package-lock.json exists
async function checkNpmLock(projectPath: string): Promise<boolean> {
  try {
    await fs.access(path.join(projectPath, 'package-lock.json'));
    return true;
  } catch {
    return false;
  }
}

// Helper function to detect framework from dependencies
function detectFramework(deps: any): string {
  if (deps?.next) return 'Next.js';
  if (deps?.nuxt) return 'Nuxt.js';
  if (deps?.gatsby) return 'Gatsby';
  if (deps?.react) return 'React';
  if (deps?.vue) return 'Vue.js';
  if (deps?.['@angular/core']) return 'Angular';
  if (deps?.svelte) return 'Svelte';
  if (deps?.express) return 'Express.js';
  if (deps?.fastify) return 'Fastify';
  if (deps?.['@nestjs/core']) return 'NestJS';
  if (deps?.solid) return 'Solid.js';
  if (deps?.astro) return 'Astro';
  
  return 'Unknown';
}

// Helper function to check for TypeScript config
async function checkTypeScriptConfig(projectPath: string): Promise<boolean> {
  try {
    const tsConfigPath = path.join(projectPath, 'tsconfig.json');
    await fs.access(tsConfigPath);
    return true;
  } catch {
    return false;
  }
}

// Analyze Nx projects (different structure)
async function analyzeNxProjects(rootPath: string, projects: string[]): Promise<any[]> {
  const subProjects: any[] = [];
  
  for (const projectPath of projects) {
    try {
      const fullPath = path.join(rootPath, projectPath);
      const packageJsonPath = path.join(fullPath, 'package.json');
      
      // Check project.json first (Nx style)
      const projectJsonPath = path.join(fullPath, 'project.json');
      
      let projectInfo: any = {};
      let projectName = path.basename(projectPath);
      
      try {
        await fs.access(projectJsonPath);
        const projectJson = JSON.parse(await fs.readFile(projectJsonPath, 'utf-8'));
        projectName = projectJson.name || projectName;
      } catch {}
      
      try {
        await fs.access(packageJsonPath);
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
        projectInfo = packageJson;
        projectName = packageJson.name || projectName;
      } catch {}
      
      const deps = { ...projectInfo.dependencies, ...projectInfo.devDependencies };
      
      subProjects.push({
        name: projectName,
        relativePath: projectPath,
        framework: detectFramework(deps),
        hasTypeScript: !!(deps?.typescript || deps?.['@types/node']),
        version: projectInfo.version
      });
    } catch (error) {
      console.error(`Error analyzing Nx project ${projectPath}:`, error);
    }
  }
  
  return subProjects;
}

// Helper function to analyze workspace packages
async function analyzeWorkspaces(rootPath: string, workspaces: string[]): Promise<any[]> {
  const subProjects: any[] = [];
  
  for (const workspace of workspaces) {
    try {
      const workspacePaths = await expandWorkspaceGlob(rootPath, workspace);
      
      for (const workspacePath of workspacePaths) {
        const fullPath = path.join(rootPath, workspacePath);
        const packageJsonPath = path.join(fullPath, 'package.json');
        
        try {
          await fs.access(packageJsonPath);
          const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
          const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
          
          subProjects.push({
            name: packageJson.name || path.basename(workspacePath),
            relativePath: workspacePath,
            framework: detectFramework(deps),
            hasTypeScript: !!(deps?.typescript || deps?.['@types/node']),
            version: packageJson.version
          });
        } catch {
          // Skip if package.json doesn't exist
        }
      }
    } catch (error) {
      console.error(`Error analyzing workspace ${workspace}:`, error);
    }
  }
  
  return subProjects;
}

// Simple glob expansion for workspace patterns
async function expandWorkspaceGlob(rootPath: string, glob: string): Promise<string[]> {
  try {
    // Handle simple patterns like "packages/*" or "apps/*"
    if (glob.includes('*')) {
      const baseDir = glob.replace('/*', '');
      const basePath = path.join(rootPath, baseDir);
      
      try {
        const entries = await fs.readdir(basePath, { withFileTypes: true });
        return entries
          .filter(entry => entry.isDirectory())
          .map(entry => path.join(baseDir, entry.name));
      } catch {
        return [];
      }
    } else {
      // Direct path
      return [glob];
    }
  } catch {
    return [];
  }
}

export { getProjectInfo };