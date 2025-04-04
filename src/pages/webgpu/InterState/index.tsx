import { WebGpuTemplate } from '@/components/WebGpuTemplate';

const renderTriangle = (device: GPUDevice, context: GPUCanvasContext) => {
  const presentationFormant = navigator.gpu.getPreferredCanvasFormat();
  const module = device.createShaderModule({
    label: 'our hardcoded rgba triangle shaders',
    code: `
      struct OurVertexShaderOutput {
        @builtin(position) position: vec4f,
        @location(0) color: vec4f,
      };
      @vertex fn vs(
        @builtin(vertex_index) vertexIndex : u32
      ) -> OurVertexShaderOutput {
        let pos = array(
          vec2f( 0.0,  0.5),  // top center
          vec2f(-0.5, -0.5),  // bottom left
          vec2f( 0.5, -0.5)   // bottom right
        );
        var color = array<vec4f, 3>(
          vec4f(1, 0, 0, 1), // red
          vec4f(0, 1, 0, 1), // green
          vec4f(0, 0, 1, 1), // blue
        );

        var vsOutput: OurVertexShaderOutput;
        vsOutput.position = vec4f(pos[vertexIndex], 0.0, 1.0);
        vsOutput.color = color[vertexIndex];
        return vsOutput;
      }

      @fragment fn fs(fsInput: OurVertexShaderOutput) -> @location(0) vec4f {
        return fsInput.color;
      }
    `,
  });

  const pipeline = device.createRenderPipeline({
    label: 'our hardcoded red triangle pipeline',
    layout: 'auto',
    vertex: {
      module,
      entryPoint: 'vs',
    },
    fragment: {
      module,
      entryPoint: 'fs',
      targets: [
        {
          format: presentationFormant,
        },
      ],
    },
  });

  const renderPassDescriptor = {
    label: 'our basic canvas render pass',
    colorAttachments: [
      {
        view: null as any,
        clearValue: [0.3, 0.3, 0.3, 1],
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
  };

  const render = () => {
    renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
    const encoder = device.createCommandEncoder({ label: 'our encoder' });
    const pass = encoder.beginRenderPass(renderPassDescriptor as any);
    pass.setPipeline(pipeline);
    pass.draw(3);
    pass.end();
    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  };

  render();
};

const renderTriangle2 = (device: GPUDevice, context: GPUCanvasContext) => {
  const presentationFormant = navigator.gpu.getPreferredCanvasFormat();
  const module = device.createShaderModule({
    label: 'our hardcoded rgba triangle shaders',
    code: `
      struct OurVertexShaderOutput {
        @builtin(position) position: vec4f,
      };
      @vertex fn vs(
        @builtin(vertex_index) vertexIndex : u32
      ) -> OurVertexShaderOutput {
        let pos = array(
          vec2f( 0.0,  0.5),  // top center
          vec2f(-0.5, -0.5),  // bottom left
          vec2f( 0.5, -0.5)   // bottom right
        );


        var vsOutput: OurVertexShaderOutput;
        vsOutput.position = vec4f(pos[vertexIndex], 0.0, 1.0);
        return vsOutput;
      }

      @fragment fn fs(fsInput: OurVertexShaderOutput) -> @location(0) vec4f {
        let red = vec4f(1, 0, 0, 1);
        let cyan = vec4f(0, 1, 1, 1);
        let grid = vec2u(fsInput.position.xy) / 8;
        let checker = (grid.x + grid.y) % 2 == 1;

        return select(red, cyan, checker);
      }
    `,
  });

  const pipeline = device.createRenderPipeline({
    label: 'our hardcoded red triangle pipeline',
    layout: 'auto',
    vertex: {
      module,
      entryPoint: 'vs',
    },
    fragment: {
      module,
      entryPoint: 'fs',
      targets: [
        {
          format: presentationFormant,
        },
      ],
    },
  });

  const renderPassDescriptor = {
    label: 'our basic canvas render pass',
    colorAttachments: [
      {
        view: null as any,
        clearValue: [0.3, 0.3, 0.3, 1],
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
  };

  const render = () => {
    renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
    const encoder = device.createCommandEncoder({ label: 'our encoder' });
    const pass = encoder.beginRenderPass(renderPassDescriptor as any);
    pass.setPipeline(pipeline);
    pass.draw(3);
    pass.end();
    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  };

  render();
};

const renderTriangle3 = (device: GPUDevice, context: GPUCanvasContext) => {
  const presentationFormant = navigator.gpu.getPreferredCanvasFormat();
  const vsModule = device.createShaderModule({
    label: 'hardcoded triangle',
    code: `
      struct OurVertexShaderOutput {
        @builtin(position) position: vec4f,
      };
      @vertex fn vs(
        @builtin(vertex_index) vertexIndex : u32
      ) -> OurVertexShaderOutput {
        let pos = array(
          vec2f( 0.0,  0.5),  // top center
          vec2f(-0.5, -0.5),  // bottom left
          vec2f( 0.5, -0.5)   // bottom right
        );


        var vsOutput: OurVertexShaderOutput;
        vsOutput.position = vec4f(pos[vertexIndex], 0.0, 1.0);
        return vsOutput;
      }

    `,
  });

  const fsModule = device.createShaderModule({
    label: 'checkerboard',
    code: `
      @fragment fn fs(@builtin(position) pixelPosition: vec4f) -> @location(0) vec4f {
        let red = vec4f(1, 0, 0, 1);
        let cyan = vec4f(0, 1, 1, 1);
        let grid = vec2u(pixelPosition.xy) / 8;
        let checker = (grid.x + grid.y) % 2 == 1;

        return select(red, cyan, checker);
      }
    `,
  });

  const pipeline = device.createRenderPipeline({
    label: 'our hardcoded red triangle pipeline',
    layout: 'auto',
    vertex: {
      module: vsModule,
      entryPoint: 'vs',
    },
    fragment: {
      module: fsModule,
      entryPoint: 'fs',
      targets: [
        {
          format: presentationFormant,
        },
      ],
    },
  });

  const renderPassDescriptor = {
    label: 'our basic canvas render pass',
    colorAttachments: [
      {
        view: null as any,
        clearValue: [0.3, 0.3, 0.3, 1],
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
  };

  const render = () => {
    renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
    const encoder = device.createCommandEncoder({ label: 'our encoder' });
    const pass = encoder.beginRenderPass(renderPassDescriptor as any);
    pass.setPipeline(pipeline);
    pass.draw(3);
    pass.end();
    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  };

  render();
};

export const InterState: React.FC = () => {
  return (
    <div className="flex">
      <WebGpuTemplate render={renderTriangle} />
      <WebGpuTemplate render={renderTriangle2} />
      <WebGpuTemplate render={renderTriangle3} />
    </div>
  );
};

export default InterState;
