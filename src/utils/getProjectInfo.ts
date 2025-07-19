import path from "path";
import { promises as fs } from "fs";

async function getProjectInfo(projectPath: string) {
  try {
    const packageJsonPath = path.join(projectPath, 'package.json');
    let projectName = path.basename(projectPath);
    let hasPackageJson = false;
    let packageInfo: any = {};
    
    try {
      await fs.access(packageJsonPath);
      hasPackageJson = true;
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      projectName = packageJson.name || projectName;
      packageInfo = packageJson;
    } catch {
      console.error('Package json not found in current project!');
    }

    // Add some framework detection
    const deps = { ...packageInfo.dependencies, ...packageInfo.devDependencies };
    let framework = 'Unknown';
    
    if (deps?.react) framework = 'React';
    else if (deps?.vue) framework = 'Vue';
    else if (deps?.['@angular/core']) framework = 'Angular';
    else if (deps?.svelte) framework = 'Svelte';
    else if (deps?.next) framework = 'Next.js';

    // Check for TypeScript
    const hasTypeScript = !!(deps?.typescript || deps?.['@types/node']);

    return {
      content: [
        {
          type: 'text',
          text: `📁 **Project Information**\n\n` +
                `**Name:** ${projectName}\n` +
                `**Path:** ${projectPath}\n` +
                `**Framework:** ${framework}\n` +
                `**TypeScript:** ${hasTypeScript ? '✅' : '❌'}\n` +
                `**Has package.json:** ${hasPackageJson ? '✅' : '❌'}\n\n` +
                `✅ Frontend Final Boss MCP server is working!\n` +
                `🔧 Ready to add more frontend tech lead tools!`,
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

export { getProjectInfo };