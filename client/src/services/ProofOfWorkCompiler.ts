import { databaseManager } from './DatabaseManager';
import { skillTree } from './SkillTree';
import * as Clipboard from 'expo-clipboard';

export interface ProgressReport {
  title: string;
  period: string;
  totalEXP: number;
  completedNodes: Array<{
    phase: number;
    phaseName: string;
    nodeName: string;
    proofOfWork: string;
    completedAt: string;
  }>;
  markdown: string;
}

const PHASE_NAMES: Record<number, string> = {
  1: 'Phase 1: MERN Stack',
  2: 'Phase 2: DevOps',
  3: 'Phase 3: DevSecOps',
  4: 'Phase 4: AI/ML'
};

const NODE_EXP_VALUE = 20; // EXP awarded per completed node

class ProofOfWorkCompilerImpl {
  /**
   * Generate progress report for a date range
   * Requirement 36.4: Query completed skill_nodes within date range
   */
  async generateReport(startDate: string, endDate: string): Promise<ProgressReport> {
    try {
      // Requirement 36.4: Query completed nodes in date range
      const nodes = await skillTree.getCompletedNodes(startDate, endDate);

      // Requirement 36.7: Calculate total EXP earned from completed nodes
      const totalEXP = nodes.length * NODE_EXP_VALUE;

      // Requirement 36.5: Group nodes by phase
      const nodesByPhase: Record<number, typeof nodes> = {
        1: [],
        2: [],
        3: [],
        4: []
      };

      nodes.forEach(node => {
        if (nodesByPhase[node.phase]) {
          nodesByPhase[node.phase].push(node);
        }
      });

      // Requirement 36.6: Format output as Markdown with headers, bullet lists, and GitHub links
      const markdown = this.generateMarkdown(startDate, endDate, totalEXP, nodesByPhase);

      // Format period
      const period = `${this.formatDate(startDate)} - ${this.formatDate(endDate)}`;

      // Format completed nodes
      const completedNodes = nodes.map(node => ({
        phase: node.phase,
        phaseName: PHASE_NAMES[node.phase],
        nodeName: node.name,
        proofOfWork: node.proofOfWork || 'No proof provided',
        completedAt: node.completedAt || ''
      }));

      return {
        title: `Progress Report - ${this.getMonthYear(endDate)}`,
        period,
        totalEXP,
        completedNodes,
        markdown
      };
    } catch (error) {
      console.error('Failed to generate report:', error);
      throw new Error('Failed to generate progress report');
    }
  }

  /**
   * Generate report for the past 30 days
   * Requirement 36.2: Default to past 30 days filter
   */
  async generateMonthlyReport(): Promise<ProgressReport> {
    const endDate = new Date().toISOString();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    return this.generateReport(startDate.toISOString(), endDate);
  }

  /**
   * Copy report to clipboard
   * Requirement 36.9: Copy Markdown to device clipboard on button tap
   */
  async copyToClipboard(markdown: string): Promise<void> {
    try {
      await Clipboard.setStringAsync(markdown);
      console.log('Report copied to clipboard');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      throw new Error('Failed to copy report to clipboard');
    }
  }

  /**
   * Generate markdown string
   * Requirement 36.6: Format output as Markdown with headers, bullet lists, and GitHub links
   */
  private generateMarkdown(
    startDate: string,
    endDate: string,
    totalEXP: number,
    nodesByPhase: Record<number, any[]>
  ): string {
    const monthYear = this.getMonthYear(endDate);
    const period = `${this.formatDate(startDate)} - ${this.formatDate(endDate)}`;

    let markdown = `# Proof-of-Work Report - ${monthYear}\n\n`;
    markdown += `**Period:** ${period}\n`;
    markdown += `**Total EXP Earned:** ${totalEXP}\n\n`;
    markdown += `---\n\n`;

    // Requirement 36.5: Group nodes by phase
    // Requirement 36.6: Format with headers, bullet lists, and GitHub links
    for (let phase = 1; phase <= 4; phase++) {
      const nodes = nodesByPhase[phase];
      
      if (nodes.length > 0) {
        markdown += `## ${PHASE_NAMES[phase]}\n\n`;
        
        nodes.forEach(node => {
          markdown += `- **${node.name}**\n`;
          
          if (node.proofOfWork) {
            // Check if proof of work is a GitHub URL
            if (this.isGitHubURL(node.proofOfWork)) {
              markdown += `  - Proof: [GitHub Link](${node.proofOfWork})\n`;
            } else {
              markdown += `  - Proof: ${node.proofOfWork}\n`;
            }
          }
          
          if (node.completedAt) {
            markdown += `  - Completed: ${this.formatDate(node.completedAt)}\n`;
          }
          
          markdown += `\n`;
        });
      }
    }

    // Add summary
    const totalNodes = Object.values(nodesByPhase).reduce((sum, nodes) => sum + nodes.length, 0);
    markdown += `---\n\n`;
    markdown += `## Summary\n\n`;
    markdown += `- **Completed Nodes:** ${totalNodes}\n`;
    markdown += `- **Total EXP Earned:** ${totalEXP}\n`;
    markdown += `- **Period:** ${period}\n\n`;
    
    // Add breakdown by phase
    markdown += `### Breakdown by Phase\n\n`;
    for (let phase = 1; phase <= 4; phase++) {
      const count = nodesByPhase[phase].length;
      if (count > 0) {
        markdown += `- ${PHASE_NAMES[phase]}: ${count} node${count !== 1 ? 's' : ''}\n`;
      }
    }

    return markdown;
  }

  /**
   * Check if a string is a GitHub URL
   */
  private isGitHubURL(url: string): boolean {
    return url.toLowerCase().includes('github.com');
  }

  /**
   * Format date as YYYY-MM-DD
   */
  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  }

  /**
   * Get month and year from date
   */
  private getMonthYear(dateString: string): string {
    const date = new Date(dateString);
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  }
}

// Singleton instance
export const proofOfWorkCompiler = new ProofOfWorkCompilerImpl();
