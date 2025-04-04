import { WebGpuTemplate } from '../../../components/WebGpuTemplate';
import { rand } from '../../../utils';

const renderTriangle = (device: GPUDevice, context: GPUCanvasContext, canvas: HTMLCanvasElement) => {
  const presentationFormant = navigator.gpu.getPreferredCanvasFormat();
  const module = device.createShaderModule({
    label: 'our hardcoded rgba triangle shaders',
    code: `
      struct OurStruct {
        color: vec4f,
        scale: vec2f,
        offset: vec2f,
      };

      @group(0) @binding(0) var<uniform> ourStruct: OurStruct;

      @vertex fn vs(
        @builtin(vertex_index) vertexIndex : u32
      ) -> @builtin(position) vec4<f32> {
        let pos = array(
          vec2f( 0.0,  0.5),  // top center
          vec2f(-0.5, -0.5),  // bottom left
          vec2f( 0.5, -0.5)   // bottom right
        );
        return vec4f(pos[vertexIndex] * ourStruct.scale + ourStruct.offset, 0.0, 1.0);
      }

      @fragment fn fs() -> @location(0) vec4f {
        return ourStruct.color;
      }
    `,
  });

  const uniformBufferSize = 4 * 4 + 4 * 2 + 4 * 2;

  const uniformBuffer = device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const uniformValues = new Float32Array(uniformBufferSize / 4);

  const kColorOffset = 0;
  const kScaleOffset = 4;
  const kOffsetOffset = 6;

  uniformValues.set([0, 1, 0, 1], kColorOffset);
  uniformValues.set([-0.5, -0.25], kOffsetOffset);

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

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: uniformBuffer,
        },
      },
    ],
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
    const aspect = canvas.width / canvas.height;
    uniformValues.set([0.5 / aspect, 0.5], kScaleOffset);
    device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

    renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
    const encoder = device.createCommandEncoder({ label: 'our encoder' });
    const pass = encoder.beginRenderPass(renderPassDescriptor as any);
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(3);
    pass.end();
    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  };

  render();
};

const renderTriangle2 = (device: GPUDevice, context: GPUCanvasContext, canvas: HTMLCanvasElement) => {
  const presentationFormant = navigator.gpu.getPreferredCanvasFormat();
  const module = device.createShaderModule({
    label: 'our hardcoded rgba triangle shaders',
    code: `
      struct OurStruct {
        color: vec4f,
        scale: vec2f,
        offset: vec2f,
      };

      @group(0) @binding(0) var<uniform> ourStruct: OurStruct;

      @vertex fn vs(
        @builtin(vertex_index) vertexIndex : u32
      ) -> @builtin(position) vec4<f32> {
        let pos = array(
          vec2f( 0.0,  0.5),  // top center
          vec2f(-0.5, -0.5),  // bottom left
          vec2f( 0.5, -0.5)   // bottom right
        );
        return vec4f(pos[vertexIndex] * ourStruct.scale + ourStruct.offset, 0.0, 1.0);
      }

      @fragment fn fs() -> @location(0) vec4f {
        return ourStruct.color;
      }
    `,
  });

  const uniformBufferSize = 4 * 4 + 4 * 2 + 4 * 2;

  const kColorOffset = 0;
  const kScaleOffset = 4;
  const kOffsetOffset = 6;
  const kNumObjects = 100;
  const objectInfos: {
    scale: number;
    uniformBuffer: GPUBuffer;
    uniformValues: Float32Array;
    bindGroup: GPUBindGroup;
  }[] = [];
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

  for (let i = 0; i < kNumObjects; ++i) {
    const uniformBuffer = device.createBuffer({
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const uniformValues = new Float32Array(uniformBufferSize / 4);
    uniformValues.set([rand(), rand(), rand(), 1], kColorOffset);
    uniformValues.set([rand(-0.9, 0.9), rand(-0.9, 0.9)], kOffsetOffset);

    const bindGroup = device.createBindGroup({
      label: `bind group for obj: ${i}`,
      layout: pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
    });

    objectInfos.push({
      scale: rand(0.2, 0.5),
      uniformBuffer,
      uniformValues,
      bindGroup,
    });
  }

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
    const encoder = device.createCommandEncoder({ label: 'our encoder' });
    renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
    const pass = encoder.beginRenderPass(renderPassDescriptor as any);
    pass.setPipeline(pipeline);

    // Set the uniform values in our JavaScript side Float32Array
    const aspect = canvas.width / canvas.height;
    for (const { scale, bindGroup, uniformBuffer, uniformValues } of objectInfos) {
      uniformValues.set([scale / aspect, scale], kScaleOffset); // set the scale
      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
      pass.setBindGroup(0, bindGroup);
      pass.draw(3);
    }

    pass.end();
    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  };

  render();
};

const renderTriangle3 = (device: GPUDevice, context: GPUCanvasContext, canvas: HTMLCanvasElement) => {
  const presentationFormant = navigator.gpu.getPreferredCanvasFormat();
  const module = device.createShaderModule({
    label: 'our hardcoded rgba triangle shaders',
    code: `
      struct OurStruct {
        color: vec4f,
        offset: vec2f,
      };

      struct OtherStruct {
        scale: vec2f,
      };

      @group(0) @binding(0) var<uniform> ourStruct: OurStruct;
      @group(0) @binding(1) var<uniform> otherStruct: OtherStruct;

      @vertex fn vs(
        @builtin(vertex_index) vertexIndex : u32
      ) -> @builtin(position) vec4<f32> {
        let pos = array(
          vec2f( 0.0,  0.5),  // top center
          vec2f(-0.5, -0.5),  // bottom left
          vec2f( 0.5, -0.5)   // bottom right
        );
        return vec4f(pos[vertexIndex] * otherStruct.scale + ourStruct.offset, 0.0, 1.0);
      }

      @fragment fn fs() -> @location(0) vec4f {
        return ourStruct.color;
      }
    `,
  });

  const staticUniformBufferSize =
    4 * 4 + // color
    4 * 2 + // offset
    4 * 2; // padding

  const changingUniformBufferSize = 4 * 2;

  const kColorOffset = 0;
  const kOffsetOffset = 4;

  const kScaleOffset = 0;
  const kNumObjects = 100;
  const objectInfos: {
    scale: number;
    uniformBuffer: GPUBuffer;
    uniformValues: Float32Array;
    bindGroup: GPUBindGroup;
  }[] = [];

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

  for (let i = 0; i < kNumObjects; ++i) {
    const staticUniformBuffer = device.createBuffer({
      label: `static uniforms for obj: ${i}`,
      size: staticUniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const staticUniformValues = new Float32Array(staticUniformBufferSize / 4);
    staticUniformValues.set([rand(), rand(), rand(), 1], kColorOffset);
    staticUniformValues.set([rand(-0.9, 0.9), rand(-0.9, 0.9)], kOffsetOffset);
    device.queue.writeBuffer(staticUniformBuffer, 0, staticUniformValues);

    const uniformBuffer = device.createBuffer({
      label: `changing uniforms for obj: ${i}`,
      size: changingUniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const uniformValues = new Float32Array(changingUniformBufferSize / 4);

    const bindGroup = device.createBindGroup({
      label: `bind group for obj: ${i}`,
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: staticUniformBuffer } },
        {
          binding: 1,
          resource: {
            buffer: uniformBuffer,
          },
        },
      ],
    });

    objectInfos.push({
      scale: rand(0.2, 0.5),
      uniformBuffer,
      uniformValues,
      bindGroup,
    });
  }

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
    const encoder = device.createCommandEncoder({ label: 'our encoder' });
    renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
    const pass = encoder.beginRenderPass(renderPassDescriptor as any);
    pass.setPipeline(pipeline);

    // Set the uniform values in our JavaScript side Float32Array
    const aspect = canvas.width / canvas.height;
    for (const { scale, bindGroup, uniformBuffer, uniformValues } of objectInfos) {
      uniformValues.set([scale / aspect, scale], kScaleOffset); // set the scale
      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
      pass.setBindGroup(0, bindGroup);
      pass.draw(3);
    }

    pass.end();
    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  };

  render();
};

export const UniformBuffer: React.FC = () => {
  return (
    <div className="flex">
      <WebGpuTemplate render={renderTriangle} />
      <WebGpuTemplate render={renderTriangle2} />
      <WebGpuTemplate render={renderTriangle3} />
    </div>
  );
};

export default UniformBuffer;
