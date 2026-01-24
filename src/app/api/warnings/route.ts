import { NextResponse } from 'next/server';

export interface AvalancheWarning {
  id: string;
  zone: string;
  zoneId: string;
  type: 'warning' | 'watch' | 'special';
  title: string;
  dangerRating: number;
  issuedTime: string;
  expiresTime: string;
  bottomLine: string;
  author: string;
  cbacUrl: string;
}

// Zone mapping from avalanche.org to our zone IDs
const ZONE_MAPPING: Record<string, string> = {
  'Northwest Mountains': 'northwest',
  'Southeast Mountains': 'southeast',
};

export async function GET() {
  try {
    // Fetch current products from avalanche.org API
    const today = new Date().toISOString().split('T')[0];
    const response = await fetch(
      `https://api.avalanche.org/v2/public/products?avalanche_center_id=CBAC&date_start=${today}`,
      {
        headers: {
          'User-Agent': 'BackcountryCrews/1.0 (https://backcountrycrews.com)',
        },
        next: { revalidate: 300 }, // Cache for 5 minutes
      }
    );

    if (!response.ok) {
      console.error('Avalanche.org API error:', response.status);
      return NextResponse.json({ warnings: [], error: 'API unavailable' });
    }

    const data = await response.json();
    const warnings: AvalancheWarning[] = [];

    // Process products to find warnings
    for (const product of data) {
      // Check for high/extreme danger (rating 4 or 5) or explicit warning products
      const dangerRating = product.danger_rating || 0;
      const isHighDanger = dangerRating >= 4;
      const isWarningProduct = product.product_type === 'warning' || product.product_type === 'watch';

      if (isHighDanger || isWarningProduct) {
        // Get zone name from forecast_zone array
        const zoneName = product.forecast_zone?.[0]?.name || 'Unknown';
        const zoneId = ZONE_MAPPING[zoneName] || 'unknown';

        // Extract text from bottom_line (it may have HTML)
        let bottomLine = product.bottom_line || '';
        // Strip HTML tags for plain text
        bottomLine = bottomLine.replace(/<[^>]*>/g, '').trim();
        // Truncate if too long
        if (bottomLine.length > 300) {
          bottomLine = bottomLine.substring(0, 297) + '...';
        }

        warnings.push({
          id: product.id?.toString() || `warning-${Date.now()}`,
          zone: zoneName,
          zoneId,
          type: dangerRating >= 4 ? 'warning' : 'watch',
          title: dangerRating >= 4 ? 'Avalanche Warning' : 'Avalanche Watch',
          dangerRating,
          issuedTime: product.published_time || product.created_at,
          expiresTime: product.expires_time,
          bottomLine,
          author: product.author || 'CBAC',
          cbacUrl: 'https://cbavalanchecenter.org/forecasts/',
        });
      }
    }

    // Dedupe by zone (keep most recent/severe)
    const uniqueWarnings = Object.values(
      warnings.reduce((acc, w) => {
        const existing = acc[w.zoneId];
        if (!existing || w.dangerRating > existing.dangerRating) {
          acc[w.zoneId] = w;
        }
        return acc;
      }, {} as Record<string, AvalancheWarning>)
    );

    return NextResponse.json({
      warnings: uniqueWarnings,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching warnings:', error);
    return NextResponse.json({
      warnings: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
