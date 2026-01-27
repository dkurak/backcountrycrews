import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Wilderness First Aid',
  description: 'Essential wilderness first aid knowledge for backcountry emergencies in the Crested Butte area.',
};

export default function WildernessFirstAidPage() {
  return (
    <div className="space-y-8">
      <div>
        <Link href="/field-guide" className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block">
          &larr; Field Guide
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Wilderness First Aid</h1>
        <p className="text-gray-600 mt-1">
          Essential first aid knowledge for when help is hours away. This is not a substitute for formal training.
        </p>
      </div>

      {/* Training callout */}
      <section className="bg-red-50 border border-red-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-red-900 mb-2">Get Trained</h2>
        <p className="text-sm text-red-800">
          Nothing replaces hands-on training. Take a <strong>Wilderness First Responder (WFR)</strong> or at minimum a
          <strong> Wilderness First Aid (WFA)</strong> course before heading into the backcountry regularly. NOLS Wilderness Medicine,
          SOLO, and the Wilderness Medicine Institute all offer courses in Colorado.
        </p>
      </section>

      {/* First Aid Kit */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Backcountry First Aid Kit Essentials</h2>
        <div className="grid sm:grid-cols-2 gap-4 text-sm text-gray-700">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Wound Care</h3>
            <ul className="space-y-1">
              <li>Nitrile gloves (2-3 pairs)</li>
              <li>Gauze pads (4x4) and roller gauze</li>
              <li>Adhesive bandages (assorted)</li>
              <li>Steri-strips or butterfly closures</li>
              <li>Medical tape</li>
              <li>Irrigation syringe</li>
              <li>Antiseptic wipes</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Trauma & Stabilization</h3>
            <ul className="space-y-1">
              <li>SAM splint or improvised splint materials</li>
              <li>Elastic wrap (ACE bandage)</li>
              <li>Triangular bandage / cravat</li>
              <li>Hemostatic gauze (for severe bleeding)</li>
              <li>Emergency blanket (2x)</li>
              <li>Chest seal (for penetrating chest injuries)</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Medications</h3>
            <ul className="space-y-1">
              <li>Ibuprofen (anti-inflammatory / pain)</li>
              <li>Acetaminophen (pain / fever)</li>
              <li>Diphenhydramine (allergic reactions)</li>
              <li>Epinephrine auto-injector (if prescribed)</li>
              <li>Any personal prescriptions</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Tools</h3>
            <ul className="space-y-1">
              <li>Trauma shears</li>
              <li>Tweezers</li>
              <li>Safety pins</li>
              <li>Pencil and waterproof paper (for patient notes)</li>
              <li>CPR pocket mask</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Scene Assessment */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Scene Assessment: First Steps</h2>
        <div className="text-sm text-gray-700 space-y-3">
          <p>When you come upon an accident or injury in the backcountry, follow this sequence:</p>
          <ol className="space-y-3">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold">1</span>
              <div>
                <strong>Scene Safety.</strong> Is the area safe for you? Avalanche terrain, rockfall, traffic, exposure.
                You cannot help anyone if you become a victim. Do not rush in.
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold">2</span>
              <div>
                <strong>Number of patients.</strong> Look around. Is there more than one person injured? Triage if needed.
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold">3</span>
              <div>
                <strong>Mechanism of injury.</strong> What happened? This tells you what injuries to expect (fall, tree strike, burial, etc.).
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold">4</span>
              <div>
                <strong>Primary assessment (ABCs).</strong> Airway, Breathing, Circulation. Address life threats first.
                Check for responsiveness, open the airway, check for breathing, control major bleeding.
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold">5</span>
              <div>
                <strong>Secondary assessment.</strong> Head-to-toe exam. Look, ask, feel. Check vitals. Get a patient history (SAMPLE: Symptoms, Allergies, Medications, Past history, Last food/water, Events leading to injury).
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold">6</span>
              <div>
                <strong>Plan.</strong> Treat, monitor, and decide: can they walk out, do you need a carry-out, or do you need helicopter evacuation? Activate your emergency plan.
              </div>
            </li>
          </ol>
        </div>
      </section>

      {/* Common Backcountry Injuries */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Common Backcountry Injuries</h2>
        <div className="space-y-6 text-sm text-gray-700">

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Hypothermia</h3>
            <p className="mb-2">
              The biggest threat in Colorado&apos;s mountains year-round. Wet, windy conditions at altitude accelerate heat loss.
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li><strong>Signs:</strong> Shivering, confusion, slurred speech, clumsiness, apathy</li>
              <li><strong>Treatment:</strong> Get out of wind/wet. Remove wet clothing. Insulate from ground. Add heat sources (warm water bottles in armpits/groin). Warm sweet drinks if conscious. Gentle handling &mdash; no rubbing extremities.</li>
              <li><strong>Prevention:</strong> Layers, stay dry, eat and hydrate regularly, monitor your partners</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Fractures and Dislocations</h3>
            <p className="mb-2">
              Common from falls while skiing, biking, or scrambling.
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li><strong>Signs:</strong> Deformity, swelling, pain, inability to bear weight, crepitus</li>
              <li><strong>Treatment:</strong> Splint in position found (or position of comfort). Pad well. Check circulation below the injury (pulse, sensation, movement) before and after splinting. Manage pain.</li>
              <li><strong>Evacuation:</strong> Most fractures require professional care. Splint, manage pain, and evacuate.</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Altitude Sickness (AMS)</h3>
            <p className="mb-2">
              Common above 8,000 ft, especially for visitors. Crested Butte sits at 8,885 ft; many tours go to 12,000+ ft.
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li><strong>Signs:</strong> Headache, nausea, fatigue, dizziness, poor sleep</li>
              <li><strong>Treatment:</strong> Descend. Even 1,000-2,000 ft helps. Hydrate. Rest. Ibuprofen for headache.</li>
              <li><strong>Serious signs (HACE/HAPE):</strong> Severe headache, vomiting, confusion, ataxia (can&apos;t walk straight), gurgling breathing, cyanosis. <strong>Descend immediately.</strong> This is life-threatening.</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Severe Bleeding</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li><strong>Direct pressure</strong> is the first and most effective step. Press hard with gauze or clothing.</li>
              <li><strong>Pack the wound</strong> with gauze if pressure alone isn&apos;t working (push gauze into the wound).</li>
              <li><strong>Tourniquet</strong> for life-threatening limb bleeding that won&apos;t stop. Apply 2-3 inches above the wound. Note the time. Do not remove.</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Avalanche Burial</h3>
            <p className="mb-2">
              Time is critical. Survival drops to ~50% after 15 minutes of burial.
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li><strong>Search:</strong> Switch to receive, visual scan for clues, beacon search, probe, dig</li>
              <li><strong>Dig:</strong> Approach from downhill. Strategic shoveling (V-shaped conveyor) is faster than digging straight down.</li>
              <li><strong>Treat:</strong> Clear airway first. Assume spinal injury. Handle gently &mdash; hypothermic hearts are fragile. Begin CPR if no pulse and you can maintain it until rescue arrives.</li>
              <li><strong>Take an AIARE course</strong> for proper companion rescue training</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Emergency Contacts */}
      <section className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-3">Crested Butte Area Emergency Contacts</h2>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div>
            <p className="font-medium text-blue-900">911 (Emergency)</p>
            <p className="text-blue-700">Cell service is limited &mdash; know your location (GPS coordinates) before calling</p>
          </div>
          <div>
            <p className="font-medium text-blue-900">Gunnison County Search &amp; Rescue</p>
            <p className="text-blue-700">Activated through 911 dispatch</p>
          </div>
          <div>
            <p className="font-medium text-blue-900">Gunnison Valley Hospital</p>
            <p className="text-blue-700">(970) 641-1456</p>
          </div>
          <div>
            <p className="font-medium text-blue-900">Colorado Poison Center</p>
            <p className="text-blue-700">1-800-222-1222</p>
          </div>
        </div>
      </section>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <strong>Disclaimer:</strong> This guide provides general reference information only. It is not a substitute for
        formal wilderness first aid or wilderness first responder training. Take a certified WFA or WFR course before
        heading into the backcountry.
      </div>
    </div>
  );
}
