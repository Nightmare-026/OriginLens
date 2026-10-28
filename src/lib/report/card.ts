import type { FileAnalysis } from '@/lib/pipeline/types';
import { formatByteSize, formatDimensions } from '@/components/inspector/labels';

/**
 * Generates a high-resolution 1200x630 Social Provenance Summary Card (PNG)
 * ready for journalists and media creators to share on social media.
 * Strictly adheres to PRD honest uncertainty and evidence transparency rules.
 */
export async function generateSocialCardBlob(analysis: FileAnalysis): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context is unavailable in this environment');
  }

  // 1. Crisp canvas background with subtle modern gradient
  const bg = ctx.createLinearGradient(0, 0, 1200, 630);
  bg.addColorStop(0, '#f8fafc');
  bg.addColorStop(1, '#e2e8f0');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1200, 630);

  // 2. Neumorphic card container
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(160, 175, 200, 0.35)';
  ctx.shadowBlur = 28;
  ctx.shadowOffsetX = 8;
  ctx.shadowOffsetY = 8;
  ctx.beginPath();
  ctx.roundRect(60, 50, 1080, 530, 24);
  ctx.fill();

  // Reset shadow for text and inner elements
  ctx.shadowColor = 'transparent';

  // 3. Header Branding
  ctx.font = 'bold 34px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText('Origin', 100, 115);

  const lensGrad = ctx.createLinearGradient(198, 0, 275, 0);
  lensGrad.addColorStop(0, '#0ea5e9');
  lensGrad.addColorStop(1, '#10b981');
  ctx.fillStyle = lensGrad;
  ctx.fillText('Lens', 198, 115);

  ctx.fillStyle = '#059669';
  ctx.font = '600 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('• Evidence Ledger Report', 285, 114);

  // Brand sub-banner
  ctx.fillStyle = '#64748b';
  ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Evidence-First Cryptographic Media Provenance Explorer', 100, 148);

  // Divider
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(100, 170);
  ctx.lineTo(1100, 170);
  ctx.stroke();

  // 4. File Information
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const displayName = analysis.file.displayName.length > 40
    ? `${analysis.file.displayName.slice(0, 37)}...`
    : analysis.file.displayName;
  ctx.fillText(displayName, 100, 215);

  ctx.fillStyle = '#475569';
  ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(
    `${formatByteSize(analysis.file.byteSize)}  ·  ${analysis.file.detectedMimeType}  ·  ${formatDimensions(analysis.file.width, analysis.file.height)}`,
    100,
    248,
  );

  // 5. SHA-256 Fingerprint Block
  ctx.fillStyle = '#f1f5f9';
  ctx.beginPath();
  ctx.roundRect(100, 275, 1000, 54, 12);
  ctx.fill();

  ctx.fillStyle = '#334155';
  ctx.font = '15px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
  ctx.fillText(`SHA-256: ${analysis.file.sha256}`, 120, 308);

  // 6. Status Chips
  const finding = analysis.finding;
  const c2paPresent = finding && finding.manifestPresence === 'present';
  const c2paValid = finding && finding.manifestValidation === 'valid';

  // Manifest Status Badge
  const badgeBg = c2paPresent && c2paValid ? '#ecfdf5' : c2paPresent ? '#fef3c7' : '#f1f5f9';
  const badgeText = c2paPresent && c2paValid ? '#065f46' : c2paPresent ? '#92400e' : '#475569';
  const badgeLabel = c2paPresent && c2paValid
    ? 'Valid C2PA Manifest'
    : c2paPresent
      ? 'C2PA Binding/Validation Issue'
      : 'No C2PA Credentials Found';

  ctx.fillStyle = badgeBg;
  ctx.beginPath();
  ctx.roundRect(100, 350, 320, 48, 12);
  ctx.fill();

  ctx.fillStyle = badgeText;
  ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(badgeLabel, 120, 380);

  // Trust Policy Badge
  ctx.fillStyle = '#f1f5f9';
  ctx.beginPath();
  ctx.roundRect(440, 350, 340, 48, 12);
  ctx.fill();

  ctx.fillStyle = '#334155';
  ctx.font = '15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(
    `Trust: ${finding?.signerTrust ?? 'not_evaluated'} (Embedded Only)`,
    460,
    380,
  );

  // AI Generator Clues Badge (if detected)
  const aiClues = analysis.metadata?.aiGeneratorClues;
  if (aiClues && aiClues.length > 0) {
    const aiText = `AI Clues: ${aiClues[0]?.generator}`;
    ctx.fillStyle = '#f5f3ff';
    ctx.beginPath();
    ctx.roundRect(800, 350, 300, 48, 12);
    ctx.fill();

    ctx.fillStyle = '#6d28d9';
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(aiText.slice(0, 30), 815, 380);
  }

  // 7. Mandatory PRD Honesty Disclaimer Block
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.roundRect(100, 420, 1000, 80, 12);
  ctx.fill();

  ctx.fillStyle = '#64748b';
  ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(
    '• Absence of C2PA credentials is NOT evidence that an image is human-made or fake.',
    120,
    448,
  );
  ctx.fillText(
    '• OriginLens audits cryptographic provenance evidence; not a truth detector or universal AI detector.',
    120,
    476,
  );

  // 8. Footer credits
  ctx.fillStyle = '#94a3b8';
  ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Generated by OriginLens · Verified with c2pa-web & Meta Llama 3.2 Vision Co-Pilot', 100, 545);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to serialize social card canvas to blob'));
      }
    }, 'image/png');
  });
}

/**
 * Triggers a browser download of the generated social card PNG.
 */
export function downloadSocialCard(blob: Blob, baseName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);
  a.download = `${safeName}_provenance_card.png`;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
