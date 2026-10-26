export interface UiNode { type: string; props: Record<string, any>; children: UiNode[]; }
export interface Reply { conversationId: string; message: string; status: string; agents: string[]; results: unknown[]; schemaVersion: number; ui: UiNode; }
export interface UiAction { actionId: string; input: Record<string,string>; confirmed: boolean; }
export const registry = new Set(['column','row','card','heading','text','employee-card','promotion-card','employee-table','chart','form','button','status','confirmation','error']);
export function validTree(node: UiNode, depth = 0, budget = {count:0}): boolean {
  return !!node && registry.has(node.type) && depth <= 8 && ++budget.count <= 100 &&
    !!node.props && Array.isArray(node.children) && node.children.every(n => validTree(n, depth + 1, budget));
}
