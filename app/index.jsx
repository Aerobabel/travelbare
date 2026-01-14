// app/index.jsx  (this is at app/, not inside (tabs))
import { Redirect } from 'expo-router';
export default function Index() {
  return <Redirect href="/welcome" />;
}
