import { redirect } from 'next/navigation';

export default function WeatherPage() {
  redirect('/forecast?tab=weather');
}
