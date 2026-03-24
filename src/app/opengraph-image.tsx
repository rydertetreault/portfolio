import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'Ryder Tetreault | Software Engineer & Cyber Defense';

export const size = { width: 1200, height: 630 };

export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #062e1f 100%)',
          position: 'relative',
        }}
      >
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: '#ededed',
            letterSpacing: '-0.02em',
          }}
        >
          Ryder Tetreault
        </div>

        <div
          style={{
            width: 60,
            height: 3,
            backgroundColor: '#34d399',
            borderRadius: 2,
            marginTop: 24,
            marginBottom: 24,
          }}
        />

        <div
          style={{
            fontSize: 28,
            color: '#a3a3a3',
            fontWeight: 400,
          }}
        >
          Software Engineer & Cyber Defense
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 32,
            right: 40,
            fontSize: 18,
            color: '#525252',
          }}
        >
          rydertetreault.dev
        </div>
      </div>
    ),
    { ...size },
  );
}
