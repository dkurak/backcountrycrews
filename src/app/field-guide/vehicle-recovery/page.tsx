import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '4x4 Vehicle Recovery',
  description: 'Self-recovery and towing techniques for backcountry roads around Crested Butte and the Gunnison Valley.',
};

export default function VehicleRecoveryPage() {
  return (
    <div className="space-y-8">
      <div>
        <Link href="/field-guide" className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block">
          &larr; Field Guide
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">4x4 Vehicle Recovery</h1>
        <p className="text-gray-600 mt-1">
          Self-recovery and towing techniques for backcountry roads. Getting stuck is when &mdash; not if.
        </p>
      </div>

      {/* Essential Recovery Gear */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Essential Recovery Gear</h2>
        <div className="grid sm:grid-cols-2 gap-4 text-sm text-gray-700">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Must-Have</h3>
            <ul className="space-y-1">
              <li><strong>Recovery strap</strong> (kinetic/snatch strap, 20-30 ft, rated for your vehicle weight)</li>
              <li><strong>D-ring shackles</strong> (rated, not harbor freight specials &mdash; 2x)</li>
              <li><strong>Traction boards</strong> (MaxTrax or similar)</li>
              <li><strong>Shovel</strong> (full-size or collapsible)</li>
              <li><strong>Work gloves</strong></li>
              <li><strong>Recovery points</strong> on your vehicle (know where they are)</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Nice to Have</h3>
            <ul className="space-y-1">
              <li><strong>Winch</strong> (most reliable self-recovery tool)</li>
              <li><strong>Tree saver strap</strong> (for winch anchor)</li>
              <li><strong>Snatch block / pulley</strong> (doubles winch pulling power)</li>
              <li><strong>Hi-lift jack</strong> (versatile but learn to use it safely first)</li>
              <li><strong>Tire deflator</strong> and <strong>air compressor</strong></li>
              <li><strong>Tow hitch receiver</strong> with shackle mount</li>
              <li><strong><Link href="/field-guide/radio-channels" className="text-blue-600 hover:underline">GMRS/FRS radio</Link></strong> (communicate between vehicles)</li>
              <li><strong><Link href="/field-guide/satellite-sos" className="text-blue-600 hover:underline">Satellite communicator</Link></strong> (no cell service on most roads)</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Self-Recovery Techniques */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Self-Recovery Techniques</h2>
        <div className="space-y-6 text-sm text-gray-700">

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">1. Stop and Assess</h3>
            <p>
              When you feel yourself getting stuck, <strong>stop immediately</strong>. Spinning your wheels only digs you deeper.
              Get out and look at the situation. Where are the tires? What&apos;s the surface? Can you back out the way you came?
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">2. Air Down Your Tires</h3>
            <p>
              Reducing tire pressure to 15-20 PSI dramatically increases your tire footprint and traction in mud, snow, and sand.
              This is often enough to get unstuck on its own. <strong>Carry an air compressor to re-inflate before driving on pavement.</strong>
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">3. Dig and Clear</h3>
            <p>
              Clear snow, mud, or rocks from around all four tires and under the vehicle. Build a ramp in your exit direction.
              Place rocks, branches, or floor mats under the tires for traction if needed.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">4. Traction Boards</h3>
            <p>
              Place boards in front of (or behind) the drive wheels. Angle them down slightly into the mud/snow so the tire can grab.
              Drive slowly and steadily &mdash; don&apos;t spin. Once moving, don&apos;t stop until you&apos;re on solid ground.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">5. Winching</h3>
            <p className="mb-2">
              If you have a winch, it&apos;s the most controlled recovery method.
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Find a solid anchor (large live tree with tree saver strap, boulder, another vehicle)</li>
              <li>Spool out cable to the anchor, keeping the line as straight as possible</li>
              <li>Use a damper blanket on the cable in case it snaps</li>
              <li>Winch slowly and steadily. Help with gentle throttle if possible.</li>
              <li>Keep everyone clear of the cable path</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Tow Recovery */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Vehicle-to-Vehicle Recovery</h2>
        <div className="space-y-4 text-sm text-gray-700">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-red-900 mb-1">Safety First</h3>
            <p className="text-red-800">
              Never use a tow ball as a recovery point &mdash; they can snap off and become a deadly projectile.
              Always use rated recovery points, shackles, and straps. Keep all bystanders well clear.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Using a Kinetic Recovery Strap</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-600">
              <li>Connect the strap to rated recovery points on both vehicles using D-ring shackles</li>
              <li>Lay out the strap with some slack (about 2/3 of the strap length)</li>
              <li>The recovery vehicle drives forward slowly to take up slack, then accelerates smoothly</li>
              <li>The kinetic energy in the stretch of the strap helps pull the stuck vehicle free</li>
              <li>The stuck vehicle should be in neutral or gently applying throttle in the direction of pull</li>
              <li>Communicate with radios or hand signals. Agree on a plan before starting.</li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Static Pull (Tow Strap)</h3>
            <p>
              If using a non-kinetic tow strap, take up ALL slack before pulling. The recovery vehicle applies slow, steady power.
              No jerking &mdash; tow straps don&apos;t stretch and sudden loads can break hardware.
            </p>
          </div>
        </div>
      </section>

      {/* CB-Specific Tips */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Crested Butte Area Notes</h2>
        <div className="space-y-3 text-sm text-gray-700">
          <p>
            <strong>Kebler Pass / Ohio Pass:</strong> Mud season (May-June) turns these roads into deep mud pits. Even capable 4x4s
            get stuck regularly. Check conditions before heading out and bring full recovery gear.
          </p>
          <p>
            <strong>Gothic Road / Slate River:</strong> Snow can linger into June. The road narrows significantly past the ski area.
            Know your vehicle&apos;s clearance and don&apos;t push past where you can safely turn around.
          </p>
          <p>
            <strong>Cell service:</strong> Limited to nonexistent on most backcountry roads. Tell someone your plan
            and don&apos;t rely on calling for help. Carry a{' '}
            <Link href="/field-guide/radio-channels" className="text-blue-600 hover:underline">GMRS/FRS radio</Link>{' '}
            for communicating between vehicles and a{' '}
            <Link href="/field-guide/satellite-sos" className="text-blue-600 hover:underline">satellite communicator</Link>{' '}
            for true emergencies.
          </p>
          <p>
            <strong>Travel in pairs:</strong> Two vehicles means you always have a recovery option. Solo backcountry driving
            is significantly riskier. Radios let you coordinate between vehicles on the trail &mdash; agree on a{' '}
            <Link href="/field-guide/radio-channels" className="text-blue-600 hover:underline">channel</Link>{' '}
            before you head out.
          </p>
          <p>
            <strong>Find a buddy:</strong> Don&apos;t have a second vehicle?{' '}
            <Link href="/trips" className="text-blue-600 hover:underline">Browse upcoming trips</Link>{' '}
            or post your own to find people heading the same direction.
          </p>
        </div>
      </section>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <strong>Disclaimer:</strong> Vehicle recovery involves significant forces and inherent risks.
        Use rated equipment, follow manufacturer guidelines, and keep all people clear of straps and cables under tension.
        When in doubt, call a professional tow service.
      </div>
    </div>
  );
}
