let cachedIsSoftwareGl: boolean | null = null;

/**
 * Probes WebGL2 renderer string once per session and caches the result
 * so UI transitions and preview canvases never stall creating throwaway contexts.
 */
export function isSoftwareGlRenderer(): boolean {
  if (cachedIsSoftwareGl !== null) {
    return cachedIsSoftwareGl;
  }
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) {
      cachedIsSoftwareGl = true;
      return true;
    }
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    cachedIsSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    cachedIsSoftwareGl = false;
  }
  return cachedIsSoftwareGl;
}
