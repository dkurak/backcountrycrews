import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Radio Channels Guide',
  description: 'GMRS and FRS radio channel guide for backcountry communication in the Crested Butte and Elk Mountains area.',
};

export default function RadioChannelsPage() {
  return (
    <div className="space-y-8">
      <div>
        <Link href="/field-guide" className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block">
          &larr; Field Guide
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Radio Channels Guide</h1>
        <p className="text-gray-600 mt-1">
          GMRS and FRS channel reference for backcountry communication in the Elk Mountains.
        </p>
      </div>

      {/* GMRS vs FRS */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">GMRS vs FRS: What You Need to Know</h2>
        <div className="space-y-3 text-sm text-gray-700">
          <p>
            <strong>FRS (Family Radio Service)</strong> radios are license-free, low-power (up to 2 watts), and what most people carry.
            They work fine for short-range communication in open terrain but struggle in deep valleys and heavy timber.
          </p>
          <p>
            <strong>GMRS (General Mobile Radio Service)</strong> radios can transmit at up to 50 watts and use repeaters for extended range.
            A <strong>GMRS license is required</strong> ($35 from the FCC, covers your whole family for 10 years, no exam).
            GMRS is strongly recommended for backcountry use in the Elk Mountains where terrain blocks signals.
          </p>
          <p>
            Both GMRS and FRS share channels 1-22. Channels 8-14 are FRS-only (low power). All other channels can be used by both services,
            but GMRS users can transmit at higher power on channels 1-7 and 15-22.
          </p>
        </div>
      </section>

      {/* Recommended Channels */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recommended Channels</h2>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900">Channel 16 &mdash; Backcountry Default</h3>
            <p className="text-sm text-blue-800 mt-1">
              Widely used as the default backcountry/outdoor channel. Start here when trying to reach nearby groups.
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-900">Channel 1 &mdash; Group Communication</h3>
            <p className="text-sm text-green-800 mt-1">
              Good general-purpose channel for your group. Agree on a channel before heading out and have a backup.
            </p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="font-semibold text-purple-900">Channel 20 &mdash; Emergency / Hailing</h3>
            <p className="text-sm text-purple-800 mt-1">
              Some groups monitor channel 20 as an emergency hailing frequency. Not officially designated but commonly used.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h3 className="font-semibold text-amber-900">Snowmobile Channels</h3>
            <p className="text-sm text-amber-800 mt-1">
              Snowmobile groups in the CB area commonly use channels 17-19. Be aware of snowmobile traffic on these channels,
              especially around Kebler Pass, Ohio Pass, and the Slate River corridor.
            </p>
          </div>
        </div>
      </section>

      {/* Channel Reference Table */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Channel Reference</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-4 font-medium text-gray-700">Channel</th>
                <th className="text-left py-2 pr-4 font-medium text-gray-700">Frequency</th>
                <th className="text-left py-2 pr-4 font-medium text-gray-700">Service</th>
                <th className="text-left py-2 font-medium text-gray-700">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                { ch: '1', freq: '462.5625', service: 'FRS/GMRS', notes: 'Good general-purpose channel' },
                { ch: '2', freq: '462.5875', service: 'FRS/GMRS', notes: '' },
                { ch: '3', freq: '462.6125', service: 'FRS/GMRS', notes: '' },
                { ch: '4', freq: '462.6375', service: 'FRS/GMRS', notes: '' },
                { ch: '5', freq: '462.6625', service: 'FRS/GMRS', notes: '' },
                { ch: '6', freq: '462.6875', service: 'FRS/GMRS', notes: '' },
                { ch: '7', freq: '462.7125', service: 'FRS/GMRS', notes: '' },
                { ch: '8-14', freq: '467.5625-467.7125', service: 'FRS only', notes: 'Low power only (0.5W)' },
                { ch: '15', freq: '462.5500', service: 'FRS/GMRS', notes: '' },
                { ch: '16', freq: '462.5750', service: 'FRS/GMRS', notes: 'Common backcountry channel' },
                { ch: '17', freq: '462.6000', service: 'FRS/GMRS', notes: 'Snowmobile traffic common' },
                { ch: '18', freq: '462.6250', service: 'FRS/GMRS', notes: 'Snowmobile traffic common' },
                { ch: '19', freq: '462.6500', service: 'FRS/GMRS', notes: 'Snowmobile traffic common' },
                { ch: '20', freq: '462.6750', service: 'FRS/GMRS', notes: 'Emergency / hailing' },
                { ch: '21', freq: '462.7000', service: 'FRS/GMRS', notes: '' },
                { ch: '22', freq: '462.7250', service: 'FRS/GMRS', notes: '' },
              ].map((row) => (
                <tr key={row.ch} className={row.notes ? 'bg-gray-50/50' : ''}>
                  <td className="py-2 pr-4 font-medium text-gray-900">{row.ch}</td>
                  <td className="py-2 pr-4 text-gray-600 font-mono text-xs">{row.freq} MHz</td>
                  <td className="py-2 pr-4 text-gray-600">{row.service}</td>
                  <td className="py-2 text-gray-600">{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Best Practices */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Radio Best Practices</h2>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex gap-2">
            <span className="text-blue-600 font-bold flex-shrink-0">1.</span>
            <span><strong>Agree on a channel before you leave the trailhead.</strong> Pick a primary and a backup channel in case of interference.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-600 font-bold flex-shrink-0">2.</span>
            <span><strong>Test radios at the trailhead.</strong> Make sure everyone&apos;s radio is working and on the same channel before splitting up.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-600 font-bold flex-shrink-0">3.</span>
            <span><strong>Use call signs or names.</strong> Start transmissions with who you&apos;re calling and who you are: &quot;Dave, this is Mike, over.&quot;</span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-600 font-bold flex-shrink-0">4.</span>
            <span><strong>Keep transmissions short.</strong> Press and hold the PTT button for 1 second before speaking. Speak clearly and release when done.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-600 font-bold flex-shrink-0">5.</span>
            <span><strong>Carry spare batteries.</strong> Cold weather drains batteries fast. Keep your radio and spares in an inside pocket close to your body.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-600 font-bold flex-shrink-0">6.</span>
            <span><strong>Know your range limits.</strong> FRS radios get 0.5-1 mile in timber and valleys. GMRS can reach 2-5+ miles with clear line of sight. Ridgelines and dense forest dramatically reduce range.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-600 font-bold flex-shrink-0">7.</span>
            <span><strong>Monitor before transmitting.</strong> Listen for a few seconds before keying up to avoid talking over someone else.</span>
          </li>
        </ul>
      </section>

      {/* GMRS License */}
      <section className="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Getting a GMRS License</h2>
        <div className="text-sm text-gray-700 space-y-2">
          <p>
            A GMRS license costs <strong>$35</strong> and is valid for <strong>10 years</strong>. It covers you and your immediate family members.
            No exam is required.
          </p>
          <p>
            Apply online at the <a href="https://www.fcc.gov/wireless/universal-licensing-system" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">FCC Universal Licensing System (ULS)</a>.
          </p>
          <ol className="list-decimal list-inside space-y-1 mt-3 text-gray-600">
            <li>Create an FCC account at the ULS website</li>
            <li>Get an FRN (FCC Registration Number)</li>
            <li>Apply for a new GMRS license</li>
            <li>Pay the $35 fee</li>
            <li>Your license and call sign will be issued within a few days</li>
          </ol>
        </div>
      </section>
    </div>
  );
}
