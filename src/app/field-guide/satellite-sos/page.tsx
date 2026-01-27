import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Satellite SOS Guide',
  description: 'When and how to use satellite communicators and emergency SOS devices in the backcountry.',
};

export default function SatelliteSOSPage() {
  return (
    <div className="space-y-8">
      <div>
        <Link href="/field-guide" className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block">
          &larr; Field Guide
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Satellite SOS Guide</h1>
        <p className="text-gray-600 mt-1">
          When and how to use satellite communicators and emergency beacons in the backcountry.
        </p>
      </div>

      {/* Device Overview */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Common Devices</h2>
        <div className="space-y-4 text-sm text-gray-700">
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900">Garmin inReach (Mini, Explorer, Messenger)</h3>
            <p className="mt-1">
              Two-way satellite messaging via the Iridium network. Send and receive texts from anywhere on Earth.
              Includes SOS with two-way communication to GEOS rescue coordination center.
              Requires a subscription plan ($11.95-$64.95/month).
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900">SPOT (Gen 4, SPOT X)</h3>
            <p className="mt-1">
              One-way (Gen 4) or two-way (SPOT X) satellite messaging via Globalstar network. SOS sends your location
              to GEOS rescue center. More affordable plans but less global coverage than Iridium.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900">ACR / Ocean Signal PLBs</h3>
            <p className="mt-1">
              Personal Locator Beacons (PLBs) are one-way emergency-only devices. No subscription required.
              When activated, they send your location to search and rescue via the COSPAS-SARSAT satellite system.
              No messaging &mdash; just an SOS with GPS coordinates.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900">Apple iPhone 14+ / Satellite SOS</h3>
            <p className="mt-1">
              Built-in Emergency SOS via satellite (Globalstar). Walks you through a questionnaire and sends details
              to emergency services. Free for 2 years with iPhone purchase. One-way emergency only &mdash; not for messaging.
            </p>
          </div>
        </div>
      </section>

      {/* When to Activate SOS */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">When to Activate SOS</h2>
        <div className="space-y-4 text-sm text-gray-700">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-red-900 mb-2">Activate SOS When:</h3>
            <ul className="space-y-2 text-red-800">
              <li className="flex gap-2">
                <span className="font-bold flex-shrink-0">&#x2022;</span>
                <span><strong>Life-threatening injury or illness</strong> that requires professional medical care and you cannot self-evacuate</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold flex-shrink-0">&#x2022;</span>
                <span><strong>Someone is missing</strong> and you&apos;ve exhausted your ability to search</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold flex-shrink-0">&#x2022;</span>
                <span><strong>You are lost or stranded</strong> in conditions that threaten survival (exposure, dehydration, no shelter) and cannot self-rescue</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold flex-shrink-0">&#x2022;</span>
                <span><strong>Avalanche burial</strong> with a victim you cannot locate or extract</span>
              </li>
            </ul>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h3 className="font-semibold text-amber-900 mb-2">Do NOT Activate SOS For:</h3>
            <ul className="space-y-2 text-amber-800">
              <li className="flex gap-2">
                <span className="font-bold flex-shrink-0">&#x2022;</span>
                <span>Being tired, cold, or uncomfortable but not in danger</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold flex-shrink-0">&#x2022;</span>
                <span>Minor injuries you can manage and walk out with</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold flex-shrink-0">&#x2022;</span>
                <span>Being behind schedule but not in danger</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold flex-shrink-0">&#x2022;</span>
                <span>Vehicle breakdowns where you can safely wait or walk to a road</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold flex-shrink-0">&#x2022;</span>
                <span>Testing the device (there is a separate test mode)</span>
              </li>
            </ul>
          </div>

          <p className="text-gray-600 italic">
            When in doubt, use the &quot;what if&quot; test: If you do nothing and wait, will the situation get worse or become life-threatening?
            If yes, activate SOS. Search and rescue would rather respond to a call that turns out less serious than not be called when needed.
          </p>
        </div>
      </section>

      {/* How to Activate */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">How to Activate SOS</h2>
        <div className="space-y-4 text-sm text-gray-700">
          <ol className="space-y-4">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold">1</span>
              <div>
                <strong>Get to open sky.</strong> Satellite signals need a clear view of the sky. Move away from cliffs,
                dense tree cover, and narrow valleys if possible. Hold the device above your head if needed.
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold">2</span>
              <div>
                <strong>Activate the SOS.</strong> Most devices require you to open a cover and press-and-hold the SOS button for 3-5 seconds.
                The device will confirm activation with lights or vibration. On Garmin inReach, you can also trigger SOS from the paired app.
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold">3</span>
              <div>
                <strong>Stay put and keep the device on.</strong> Your GPS location is being transmitted.
                If you have two-way messaging (inReach, SPOT X), respond to messages from the rescue coordination center.
                They will ask about your situation, injuries, number of people, and what help you need.
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold">4</span>
              <div>
                <strong>Provide key information:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1 text-gray-600">
                  <li>Number of people in your group</li>
                  <li>Nature of the emergency (injury type, illness, stranded)</li>
                  <li>Patient condition and any first aid given</li>
                  <li>Your exact location and terrain description</li>
                  <li>Weather conditions at your location</li>
                  <li>What help you need (helicopter, ground team, medical)</li>
                </ul>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold">5</span>
              <div>
                <strong>Make yourself visible.</strong> If possible, move to an open area. Use bright clothing, a signal mirror,
                or headlamp to help rescuers find you. If a helicopter is expected, identify a flat landing zone nearby.
              </div>
            </li>
          </ol>
        </div>
      </section>

      {/* Before You Go */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Before Every Trip</h2>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex gap-2">
            <span className="text-blue-600 font-bold flex-shrink-0">&#x2713;</span>
            <span><strong>Check your subscription is active.</strong> An expired plan means your SOS may not work.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-600 font-bold flex-shrink-0">&#x2713;</span>
            <span><strong>Charge the device fully.</strong> Satellite communication drains batteries. Carry a backup battery for multi-day trips.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-600 font-bold flex-shrink-0">&#x2713;</span>
            <span><strong>Update your emergency contacts</strong> in the device or associated app. Include someone who knows your plans.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-600 font-bold flex-shrink-0">&#x2713;</span>
            <span><strong>Know how to use it.</strong> Practice sending a non-emergency check-in message. Know where the SOS button is without looking.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-600 font-bold flex-shrink-0">&#x2713;</span>
            <span><strong>Leave a trip plan</strong> with someone who is NOT on the trip. Include your route, expected return time, and when to call for help if you don&apos;t check in.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-600 font-bold flex-shrink-0">&#x2713;</span>
            <span><strong>Keep the device accessible.</strong> Don&apos;t bury it at the bottom of your pack. Chest pocket, hip belt pocket, or top-of-pack pocket.</span>
          </li>
        </ul>
      </section>

      {/* What Happens After SOS */}
      <section className="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">What Happens After You Activate SOS</h2>
        <div className="text-sm text-gray-700 space-y-3">
          <p>
            <strong>1.</strong> Your device transmits your GPS location and SOS signal to a satellite network.
          </p>
          <p>
            <strong>2.</strong> The signal is received by a rescue coordination center (GEOS for Garmin/SPOT, COSPAS-SARSAT for PLBs).
          </p>
          <p>
            <strong>3.</strong> The coordination center contacts local emergency services &mdash; in our area, that&apos;s Gunnison County
            dispatch, who activates Crested Butte Search &amp; Rescue or Western State Mountain Rescue.
          </p>
          <p>
            <strong>4.</strong> Depending on your situation and weather, rescue may come by ground team, snowmobile, or helicopter
            (Flight for Life or National Guard). Response times vary from 1-2 hours to overnight depending on conditions.
          </p>
          <p>
            <strong>5.</strong> If you have two-way messaging, the coordination center will stay in contact with you throughout.
            Keep your device on and respond to messages.
          </p>
        </div>
      </section>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <strong>Disclaimer:</strong> This guide provides general reference information. Always read your device&apos;s
        manual and understand its capabilities and limitations before relying on it in an emergency.
      </div>
    </div>
  );
}
