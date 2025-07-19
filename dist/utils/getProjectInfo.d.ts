declare function getProjectInfo(projectPath: string): Promise<{
    content: {
        type: string;
        text: string;
    }[];
}>;
export { getProjectInfo };
