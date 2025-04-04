import { WebGpuTemplate } from '@/components/WebGpuTemplate';

const renderTriangle = (device: GPUDevice, context: GPUCanvasContext) => {
  const presentationFormant = navigator.gpu.getPreferredCanvasFormat();
  const module = device.createShaderModule({
    label: 'our hardcoded red triangle shaders',
    code: `
    @vertex fn vs(
      @builtin(vertex_index) vertexIndex : u32
    ) -> @builtin(position) vec4f {
      let pos = array(
        vec2f( 0.0,  0.5),  // top center
        vec2f(-0.5, -0.5),  // bottom left
        vec2f( 0.5, -0.5)   // bottom right
      );

      return vec4f(pos[vertexIndex], 0.0, 1.0);
    }

    @fragment fn fs() -> @location(0) vec4f {
      return vec4f(1.0, 0.0, 0.0, 1.0);
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

const calculateData = async (device: GPUDevice, context: GPUCanvasContext) => {
  const module = device.createShaderModule({
    label: 'doubling compute module',
    code: `
      @group(0) @binding(0) var<storage, read_write> data: array<f32>;

      @compute @workgroup_size(1) fn computeSomething(
        @builtin(global_invocation_id) id: vec3u
      ) {
        let i = id.x;
        data[i] = data[i] * 2.0;
      }
    `,
  });

  const piplline = device.createComputePipeline({
    label: 'doubling compute pipeline',
    layout: 'auto',
    compute: {
      module,
      entryPoint: 'computeSomething',
    },
  });

  const input = new Float32Array([1, 3, 5]);

  const workBuffer = device.createBuffer({
    label: 'work buffer',
    size: input.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
  });

  device.queue.writeBuffer(workBuffer, 0, input);

  const resultBuffer = device.createBuffer({
    label: 'result buffer',
    size: input.byteLength,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });

  const bindGroup = device.createBindGroup({
    label: 'bindGroup for work buffer',
    layout: piplline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: workBuffer,
        },
      },
    ],
  });

  const encoder = device.createCommandEncoder({
    label: 'doubling encoder',
  });

  const pass = encoder.beginComputePass({
    label: 'doubling compute pass',
  });
  pass.setPipeline(piplline);
  pass.setBindGroup(0, bindGroup);
  pass.dispatchWorkgroups(input.length);
  pass.end();
  encoder.copyBufferToBuffer(workBuffer, 0, resultBuffer, 0, resultBuffer.size);
  const commandBuffer = encoder.finish();
  device.queue.submit([commandBuffer]);

  await resultBuffer.mapAsync(GPUMapMode.READ);
  const result = new Float32Array(resultBuffer.getMappedRange());
  console.log('input', input);
  console.log('result', result);
  resultBuffer.unmap();
};

const HelloWorld: React.FC = () => {
  return (
    <WebGpuTemplate
      render={(device, context) => {
        renderTriangle(device, context);
        calculateData(device, context);
      }}
    />
  );
};

export default HelloWorld;
