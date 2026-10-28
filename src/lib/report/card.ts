import type { FileAnalysis } from '@/lib/pipeline/types';
import type { Comparison } from '@/lib/results/schemas';
import { formatByteSize, formatDimensions } from '@/components/inspector/labels';

/**
 * Generates a high-resolution 1200x630 Social Provenance Summary Card (PNG)
 * ready for journalists and media creators to share on social media.
 * Strictly adheres to PRD honest uncertainty and evidence transparency rules.
 */
function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
}

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
  drawRoundRect(ctx, 60, 50, 1080, 530, 24);
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
  drawRoundRect(ctx, 100, 275, 1000, 54, 12);
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
  const badgeText = c2paPresent && c2paValid ? '#065f46' : c2paPresent ? '#92400e' : '#334155';
  const badgeLabel = c2paPresent && c2paValid
    ? 'Valid C2PA Manifest'
    : c2paPresent
      ? 'C2PA Binding/Validation Issue'
      : 'No C2PA Credentials Found';

  ctx.fillStyle = badgeBg;
  ctx.beginPath();
  drawRoundRect(ctx, 100, 350, 320, 48, 12);
  ctx.fill();

  ctx.fillStyle = badgeText;
  ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(badgeLabel, 120, 380);

  // Trust Policy Badge
  ctx.fillStyle = '#f1f5f9';
  ctx.beginPath();
  drawRoundRect(ctx, 440, 350, 340, 48, 12);
  ctx.fill();

  ctx.fillStyle = '#334155';
  ctx.font = '15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(
    `Trust: ${finding?.signerTrust ?? 'not_evaluated'} (Embedded Only)`,
    460,
    380,
  );

  // AI Generator Clues Badge (if detected)
  const meta = analysis.metadata;
  const aiClues = meta && meta.status === 'extracted' ? meta.aiGeneratorClues : undefined;
  if (aiClues && aiClues.length > 0) {
    const aiText = `AI Clues: ${aiClues[0]?.generator}`;
    ctx.fillStyle = '#f5f3ff';
    ctx.beginPath();
    drawRoundRect(ctx, 800, 350, 300, 48, 12);
    ctx.fill();

    ctx.fillStyle = '#6d28d9';
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(aiText.slice(0, 30), 815, 380);
  }

  // 7. Mandatory PRD Honesty Disclaimer Block
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  drawRoundRect(ctx, 100, 420, 1000, 80, 12);
  ctx.fill();

  ctx.fillStyle = '#475569';
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
  ctx.fillStyle = '#64748b';
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

function loadPreviewImage(url: string | null | undefined): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    if (!url.startsWith('blob:') && !url.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    const timer = setTimeout(() => {
      resolve(null);
    }, 4000);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = url;
  });
}

/**
 * Generates a high-resolution 1200x630 Provenance Comparison Summary Card (PNG)
 * displaying both thumbnails side-by-side, SHA-256 fingerprints, dimensions,
 * and the preview pixel difference metric.
 */
export async function generateComparisonCardBlob(
  first: FileAnalysis,
  second: FileAnalysis,
  comparison: Comparison,
  previewUrlA?: string | null,
  previewUrlB?: string | null,
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context is unavailable in this environment');
  }

  // Pre-load preview images in parallel
  const [imgA, imgB] = await Promise.all([
    loadPreviewImage(previewUrlA),
    loadPreviewImage(previewUrlB),
  ]);

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
  drawRoundRect(ctx, 40, 24, 1120, 582, 20);
  ctx.fill();

  ctx.shadowColor = 'transparent';

  // 3. Header Branding
  ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText('Origin', 65, 62);

  const lensGrad = ctx.createLinearGradient(145, 0, 210, 0);
  lensGrad.addColorStop(0, '#0ea5e9');
  lensGrad.addColorStop(1, '#10b981');
  ctx.fillStyle = lensGrad;
  ctx.fillText('Lens', 145, 62);

  ctx.fillStyle = '#059669';
  ctx.font = '600 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('• Provenance Delta Comparison Card', 220, 61);

  ctx.fillStyle = '#64748b';
  ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(
    'Side-by-Side Cryptographic Provenance & Preview Pixel Delta Explorer',
    65,
    88,
  );

  // Divider
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(65, 102);
  ctx.lineTo(1135, 102);
  ctx.stroke();

  // Helper to render one side
  const renderColumn = (
    side: 'A' | 'B',
    analysis: FileAnalysis,
    img: HTMLImageElement | null,
    startX: number,
  ) => {
    const colWidth = 510;

    // Side badge
    ctx.fillStyle = side === 'A' ? '#eff6ff' : '#f0fdf4';
    ctx.beginPath();
    drawRoundRect(ctx, startX, 118, 62, 24, 6);
    ctx.fill();

    ctx.fillStyle = side === 'A' ? '#1d4ed8' : '#15803d';
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`FILE ${side}`, startX + 11, 134);

    // File name
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const name = analysis.file.displayName.length > 28
      ? `${analysis.file.displayName.slice(0, 25)}...`
      : analysis.file.displayName;
    ctx.fillText(name, startX + 72, 136);

    // Dimensions, MIME, Size
    ctx.fillStyle = '#475569';
    ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(
      `${formatByteSize(analysis.file.byteSize)}  ·  ${analysis.file.detectedMimeType}  ·  ${formatDimensions(analysis.file.width, analysis.file.height)}`,
      startX,
      165,
    );

    // Thumbnail container (160 x 105)
    const thumbX = startX;
    const thumbY = 180;
    const thumbW = 160;
    const thumbH = 105;

    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    drawRoundRect(ctx, thumbX, thumbY, thumbW, thumbH, 8);
    ctx.fill();

    if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
      ctx.save();
      ctx.beginPath();
      drawRoundRect(ctx, thumbX, thumbY, thumbW, thumbH, 8);
      ctx.clip();

      const hRatio = thumbW / img.naturalWidth;
      const vRatio = thumbH / img.naturalHeight;
      const ratio = Math.min(hRatio, vRatio);
      const shiftX = (thumbW - img.naturalWidth * ratio) / 2;
      const shiftY = (thumbH - img.naturalHeight * ratio) / 2;

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(thumbX, thumbY, thumbW, thumbH);
      ctx.drawImage(
        img,
        0,
        0,
        img.naturalWidth,
        img.naturalHeight,
        thumbX + shiftX,
        thumbY + shiftY,
        img.naturalWidth * ratio,
        img.naturalHeight * ratio,
      );
      ctx.restore();
    } else {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No preview', thumbX + thumbW / 2, thumbY + thumbH / 2 + 4);
      ctx.textAlign = 'start';
    }

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    drawRoundRect(ctx, thumbX, thumbY, thumbW, thumbH, 8);
    ctx.stroke();

    // C2PA Finding beside thumbnail
    const metaX = startX + 175;
    const finding = analysis.finding;
    const c2paPresent = finding && finding.manifestPresence === 'present';
    const c2paValid = finding && finding.manifestValidation === 'valid';

    const badgeBg = c2paPresent && c2paValid ? '#ecfdf5' : c2paPresent ? '#fef3c7' : '#f1f5f9';
    const badgeText = c2paPresent && c2paValid ? '#065f46' : c2paPresent ? '#92400e' : '#334155';
    const badgeLabel = c2paPresent && c2paValid
      ? 'Valid C2PA Manifest'
      : c2paPresent
        ? (finding?.manifestValidation === 'invalid' ? 'C2PA Binding / Invalid' : 'C2PA Present (Unvalidated)')
        : 'No C2PA Manifest';

    ctx.fillStyle = badgeBg;
    ctx.beginPath();
    drawRoundRect(ctx, metaX, thumbY, 320, 36, 8);
    ctx.fill();

    ctx.fillStyle = badgeText;
    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(badgeLabel, metaX + 12, thumbY + 23);

    // Signer trust
    ctx.fillStyle = '#334155';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(
      `Trust: ${finding?.signerTrust ?? 'not_evaluated'}`,
      metaX + 12,
      thumbY + 56,
    );

    // Generator or camera clue
    const metadata = analysis.metadata;
    const aiClues = metadata && metadata.status === 'extracted' ? metadata.aiGeneratorClues : undefined;
    const cameraMake = metadata && metadata.status === 'extracted'
      ? metadata.fields.find((f) => f.key === 'cameraMake')?.value
      : undefined;
    const cameraModel = metadata && metadata.status === 'extracted'
      ? metadata.fields.find((f) => f.key === 'cameraModel')?.value
      : undefined;

    if (aiClues && aiClues.length > 0) {
      ctx.fillStyle = '#6d28d9';
      ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`AI: ${aiClues[0]?.generator}`.slice(0, 34), metaX + 12, thumbY + 80);
    } else if (cameraMake || cameraModel) {
      const camera = [cameraMake, cameraModel].filter(Boolean).join(' ');
      ctx.fillStyle = '#0369a1';
      ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`Camera: ${camera}`.slice(0, 34), metaX + 12, thumbY + 80);
    } else {
      ctx.fillStyle = '#64748b';
      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Metadata: Standard parse', metaX + 12, thumbY + 80);
    }

    // SHA-256 fingerprint box
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    drawRoundRect(ctx, startX, 298, colWidth, 38, 8);
    ctx.fill();

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#334155';
    ctx.font = '11.5px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    const shaDisplay = `${analysis.file.sha256.slice(0, 24)}...${analysis.file.sha256.slice(-16)}`;
    ctx.fillText(`SHA-256: ${shaDisplay}`, startX + 10, 322);
  };

  // Render both columns
  renderColumn('A', first, imgA, 65);
  renderColumn('B', second, imgB, 625);

  // Vertical separator between columns
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(595, 115);
  ctx.lineTo(595, 345);
  ctx.stroke();

  // 4. Preview Pixel Difference Metric banner across bottom
  const bannerY = 352;
  const bannerW = 1070;
  const bannerH = 64;

  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  drawRoundRect(ctx, 65, bannerY, bannerW, bannerH, 10);
  ctx.fill();

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Pixel delta chip
  ctx.fillStyle = '#e0f2fe';
  ctx.beginPath();
  drawRoundRect(ctx, 80, bannerY + 12, 100, 26, 6);
  ctx.fill();

  ctx.fillStyle = '#0369a1';
  ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('PIXEL DELTA', 92, bannerY + 29);

  if (comparison.preview.status === 'measured') {
    const prev = comparison.preview;
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(
      `Mean Absolute Error: ${prev.meanAbsoluteChannelError} / 255  ·  Changed: ${prev.changedPixelCount.toLocaleString()} px (${(prev.changedPixelShare * 100).toFixed(2)}%)`,
      195,
      bannerY + 29,
    );

    ctx.fillStyle = '#475569';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(
      `Normalized Preview: ${formatDimensions(prev.width, prev.height)}  ·  Method: ${prev.methodId} (${prev.decoderId})`,
      195,
      bannerY + 49,
    );
  } else {
    ctx.fillStyle = '#475569';
    ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(
      `Preview Pixel Difference Skipped (${comparison.preview.reason})  ·  No pixel delta was measured.`,
      195,
      bannerY + 39,
    );
  }

  // 5. PRD Honesty Disclaimer Block
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  drawRoundRect(ctx, 65, 430, bannerW, 80, 10);
  ctx.fill();

  ctx.fillStyle = '#475569';
  ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(
    '• OriginLens compares two independent files; it never infers chronology, authorship, tampering, or intent.',
    82,
    456,
  );
  ctx.fillText(
    '• Absence of C2PA credentials is NOT evidence that an image is human-made or fake.',
    82,
    478,
  );
  ctx.fillText(
    '• Preview pixel error is a measurement of the displayed preview, not a forensic certification of origin.',
    82,
    500,
  );

  // 6. Footer credits
  ctx.fillStyle = '#64748b';
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(
    'Generated by OriginLens · Verified with c2pa-web & Meta Llama 3.2 Vision Co-Pilot',
    65,
    542,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to serialize comparison card canvas to blob'));
      }
    }, 'image/png');
  });
}

export const generateComparisonSocialCardBlob = generateComparisonCardBlob;

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
