// Config Remotion Lambda (server-only, §12/§13). `null` si non configuré →
// /api/render bascule en mode mock (dev sans AWS).
export type LambdaConfig = {
  region: string;
  functionName: string;
  serveUrl: string;
};

export function getLambdaConfig(): LambdaConfig | null {
  const region = process.env.AWS_REGION;
  const functionName = process.env.REMOTION_FUNCTION_NAME;
  const serveUrl = process.env.REMOTION_SERVE_URL;
  if (!region || !functionName || !serveUrl) return null;
  return { region, functionName, serveUrl };
}
