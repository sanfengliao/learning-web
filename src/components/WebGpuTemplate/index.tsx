import { useEffect, useRef } from 'react';
import './index.css';

interface Props {
  render: (device: GPUDevice, context: GPUCanvasContext, canvas: HTMLCanvasElement) => void;
}

export const WebGpuTemplate: React.FC<Props> = ({ render }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    (async () => {
      if (!canvasRef.current) {
        return;
      }

      if (navigator.gpu) {
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
          return;
        }

        const device = await adapter.requestDevice();
        if (!device) {
          return;
        }

        const canvas = canvasRef.current;
        const context = canvas.getContext('webgpu');
        if (!context) {
          return;
        }
        const presentationFormant = navigator.gpu.getPreferredCanvasFormat();
        context.configure({
          device,
          format: presentationFormant,
        });

        render(device, context, canvas);
      }
    })();
  }, []);
  return (
    <div>
      <canvas className="canvas" ref={canvasRef} />
    </div>
  );
};
