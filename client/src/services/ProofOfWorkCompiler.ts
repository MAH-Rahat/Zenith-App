import { databaseManager } from './DatabaseManager';
import { skillTree } from './SkillTree';
import { expSystem } from './EXPSystem';
import { Clipboard } from 'react-native';

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
  1: 'Full-Stack Mastery',
  2: 'DevSecOps Infrastructure',
  3: 'Security & Networking',
  4: 'AI & ML Engine'
};

class ProofOfWorkCompilerImpl {
  /**
   * Generate progress report for a date range
   */
  async generateReport(startDate: string, endDate: string): Promise<ProgressReport> {
    try {
      // Get completed nodes in date range
      const nodes = await skillTree.getCompletedNodes(startDate, endDate);

      // Get total EXP earned in period
      const expHistory = await expSystem.getEXPHistory(startDate, endDate);
      const totalEXP = expHistory.reduce((sum, entry) => sum + entry.expEarned, 0);

      // Group nodes by phase
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

      // Generate markdown
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
   */
  async generateMonthlyReport(): Promise<ProgressReport> {
    const endDate = new Date().toISOString();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    return this.generateReport(startDate.toISOString(), endDate);
  }

  /**
   * Copy report to clipboard
   */
  async copyToClipboard(markdown: string): Promise<void> {
    try {
      Clipboard.setString(markdown);
      console.log('Report copied to clipboard');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      throw new Error('Failed to copy report to clipboard');
    }
  }

  /**
   * Generate markdown string
   */
  private generateMarkdown(
    startDate: string,
    endDate: string,
    totalEXP: number,
    nodesByPhase: Record<number, any[]>
  ): string {
    const monthYear = this.getMonthYear(endDate);
    const period = `${this.formatDate(startDate)} - ${this.formatDate(endDate)}`;

    let markdown = `# Progress Report - ${monthYear}\n\n`;
    markdown += `**Period:** ${period}\n`;
    markdown += `**Total EXP Earned:** ${totalEXP}\n\n`;
    markdown += `---\n\n`;

    // Add completed nodes by phase
    for (let phase = 1; phase <= 4; phase++) {
      const nodes = nodesByPhase[phase];
      
      if (nodes.length > 0) {
        markdown += `## Phase ${phase}: ${PHASE_NAMES[phase]}\n\n`;
        
        nodes.forEach(node => {
          markdown += `- **${node.name}**\n`;
          if (node.proofOfWork) {
            markdown += `  - Proof: ${node.proofOfWork}\n`;
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
    markdown += `**Summary:**\n`;
    markdown += `- Completed ${totalNodes} skill nodes\n`;
    markdown += `- Earned ${totalEXP} EXP\n`;
    markdown += `- Period: ${period}\n`;

    return markdown;
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
