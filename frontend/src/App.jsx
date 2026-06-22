import { useAppStore } from './store/appStore';
import ScriptInputStep from './features/scriptInput/ScriptInputStep.jsx';
import SceneEditor from './features/sceneEditor/SceneEditor.jsx';

export default function App() {
  const step = useAppStore((s) => s.step);
  return step === 'script' ? <ScriptInputStep /> : <SceneEditor />;
}
