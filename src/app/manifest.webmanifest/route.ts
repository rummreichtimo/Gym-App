export const dynamic = 'force-static';

/** Web app manifest so IronPath can be installed to a phone home screen. */
export function GET() {
  return Response.json({
    name: 'IronPath',
    short_name: 'IronPath',
    description: 'Trainingspläne, Workout-Tracking, Ernährung und Fortschritt.',
    start_url: '/',
    display: 'standalone',
    background_color: '#090b10',
    theme_color: '#090b10',
    orientation: 'portrait',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  });
}
