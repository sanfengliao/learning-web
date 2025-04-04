import { WebGpuTemplate } from '@/components/WebGpuTemplate';
import { rand } from '@/utils';

const renderTriangle1 = (device: GPUDevice, context: GPUCanvasContext, canvas: HTMLCanvasElement) => {
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

      @group(0) @binding(0) var<storage, read> ourStructs: array<OurStruct>;
      @group(0) @binding(1) var<storage, read> otherStructs: array<OtherStruct>;

      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) color: vec4f,
      };


      @vertex fn vs(
        @builtin(vertex_index) vertexIndex : u32,
        @builtin(instance_index) instanceIndex: u32
      ) -> VSOutput {
        let pos = array(
          vec2f( 0.0,  0.5),  // top center
          vec2f(-0.5, -0.5),  // bottom left
          vec2f( 0.5, -0.5)   // bottom right
        );
        let otherStruct = otherStructs[instanceIndex];
        let ourStruct = ourStructs[instanceIndex];

        var vsOut: VSOutput;
        vsOut.position = vec4f(
            pos[vertexIndex] * otherStruct.scale + ourStruct.offset, 0.0, 1.0);
        vsOut.color = ourStruct.color;
        return vsOut;
      }

      @fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
        return vsOut.color;
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

  const staticUnitSize = 4 * 4 + 4 * 2 + 4 * 2;

  const changingUnitSize = 4 * 2;

  const kNumObjects = 100;
  const objectInfos: {
    scale: number;
  }[] = [];

  const staticStorageBufferSize = staticUnitSize * kNumObjects;
  const changingStorageBufferSize = changingUnitSize * kNumObjects;

  const staticStorageBuffer = device.createBuffer({
    label: 'static storage for objects',
    size: staticStorageBufferSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  const changingStorageBuffer = device.createBuffer({
    label: 'changing storage for objects',
    size: changingStorageBufferSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  const kColorOffset = 0;
  const kOffsetOffset = 4;
  const kScaleOffset = 0;

  const staticStorageValues = new Float32Array(staticStorageBufferSize / 4);

  for (let i = 0; i < kNumObjects; ++i) {
    const staticOffset = i * (staticUnitSize / 4);
    staticStorageValues.set([rand(), rand(), rand(), 1], staticOffset + kColorOffset);
    staticStorageValues.set([rand(-0.9, 0.9), rand(-0.9, 0.9)], staticOffset + kOffsetOffset);
    objectInfos.push({
      scale: rand(0.2, 0.5),
    });
  }

  device.queue.writeBuffer(staticStorageBuffer, 0, staticStorageValues);

  // a typed array we can use to update the changingStorageBuffer
  const storageValues = new Float32Array(changingStorageBufferSize / 4);

  const bindGroup = device.createBindGroup({
    label: 'bind group for obj',
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: staticStorageBuffer } },
      {
        binding: 1,
        resource: {
          buffer: changingStorageBuffer,
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
    const encoder = device.createCommandEncoder({ label: 'our encoder' });
    renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
    const pass = encoder.beginRenderPass(renderPassDescriptor as any);
    pass.setPipeline(pipeline);

    // Set the uniform values in our JavaScript side Float32Array
    const aspect = canvas.width / canvas.height;
    objectInfos.forEach(({ scale }, index) => {
      const offset = index * (changingUnitSize / 4);
      storageValues.set([scale / aspect, scale], offset + kScaleOffset);
    });

    device.queue.writeBuffer(changingStorageBuffer, 0, storageValues);

    pass.setBindGroup(0, bindGroup);
    pass.draw(3, kNumObjects);

    pass.end();
    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  };

  render();
};

function createCircleVertices({
  radius = 1,
  numSubdivisions = 24,
  innerRadius = 0,
  startAngle = 0,
  endAngle = Math.PI * 2,
} = {}) {
  const numVertices = numSubdivisions * 3 * 2;
  // 2 triangles per subdivision, 3 verts per tri, 2 values (xy) each.
  const vertexData = new Float32Array(numSubdivisions * 2 * 3 * 2);

  let offset = 0;
  const addVertex = (x: number, y: number) => {
    vertexData[offset++] = x;
    vertexData[offset++] = y;
  };

  // 2 vertices per subdivision
  //
  // 0--1 4
  // | / /|
  // |/ / |
  // 2 3--5
  for (let i = 0; i < numSubdivisions; ++i) {
    const angle1 = startAngle + ((i + 0) * (endAngle - startAngle)) / numSubdivisions;
    const angle2 = startAngle + ((i + 1) * (endAngle - startAngle)) / numSubdivisions;

    const c1 = Math.cos(angle1);
    const s1 = Math.sin(angle1);
    const c2 = Math.cos(angle2);
    const s2 = Math.sin(angle2);

    // first triangle
    addVertex(c1 * radius, s1 * radius);
    addVertex(c2 * radius, s2 * radius);
    addVertex(c1 * innerRadius, s1 * innerRadius);

    // second triangle
    addVertex(c1 * innerRadius, s1 * innerRadius);
    addVertex(c2 * radius, s2 * radius);
    addVertex(c2 * innerRadius, s2 * innerRadius);
  }

  return {
    vertexData,
    numVertices,
  };
}

const renderTriangle2 = (device: GPUDevice, context: GPUCanvasContext, canvas: HTMLCanvasElement) => {
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

      struct Vertex {
        position: vec2f,
      };





      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) color: vec4f,
      };

      @group(0) @binding(0) var<storage, read> ourStructs: array<OurStruct>;
      @group(0) @binding(1) var<storage, read> otherStructs: array<OtherStruct>;
      @group(0) @binding(2) var<storage, read> pos: array<Vertex>;


      @vertex fn vs(
        @builtin(vertex_index) vertexIndex : u32,
        @builtin(instance_index) instanceIndex: u32
      ) -> VSOutput {
        let otherStruct = otherStructs[instanceIndex];
        let ourStruct = ourStructs[instanceIndex];

        var vsOut: VSOutput;
        vsOut.position = vec4f(
            pos[vertexIndex].position * otherStruct.scale + ourStruct.offset, 0.0, 1.0);
        vsOut.color = ourStruct.color;
        return vsOut;
      }

      @fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
        return vsOut.color;
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

  const staticUnitSize = 4 * 4 + 4 * 2 + 4 * 2;

  const changingUnitSize = 4 * 2;

  const kNumObjects = 100;
  const objectInfos: {
    scale: number;
  }[] = [];

  const staticStorageBufferSize = staticUnitSize * kNumObjects;
  const changingStorageBufferSize = changingUnitSize * kNumObjects;

  const staticStorageBuffer = device.createBuffer({
    label: 'static storage for objects',
    size: staticStorageBufferSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  const changingStorageBuffer = device.createBuffer({
    label: 'changing storage for objects',
    size: changingStorageBufferSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  const kColorOffset = 0;
  const kOffsetOffset = 4;
  const kScaleOffset = 0;

  const staticStorageValues = new Float32Array(staticStorageBufferSize / 4);

  for (let i = 0; i < kNumObjects; ++i) {
    const staticOffset = i * (staticUnitSize / 4);
    staticStorageValues.set([rand(), rand(), rand(), 1], staticOffset + kColorOffset);
    staticStorageValues.set([rand(-0.9, 0.9), rand(-0.9, 0.9)], staticOffset + kOffsetOffset);
    objectInfos.push({
      scale: rand(0.2, 0.5),
    });
  }

  device.queue.writeBuffer(staticStorageBuffer, 0, staticStorageValues);

  const { vertexData, numVertices } = createCircleVertices({
    radius: 0.5,
    innerRadius: 0.25,
  });
  const vertexStorageBuffer = device.createBuffer({
    label: 'storage buffer vertices',
    size: vertexData.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(vertexStorageBuffer, 0, vertexData);

  // a typed array we can use to update the changingStorageBuffer
  const storageValues = new Float32Array(changingStorageBufferSize / 4);

  const bindGroup = device.createBindGroup({
    label: 'bind group for obj',
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: staticStorageBuffer } },
      {
        binding: 1,
        resource: {
          buffer: changingStorageBuffer,
        },
      },
      { binding: 2, resource: { buffer: vertexStorageBuffer } },
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
    const encoder = device.createCommandEncoder({ label: 'our encoder' });
    renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
    const pass = encoder.beginRenderPass(renderPassDescriptor as any);
    pass.setPipeline(pipeline);

    // Set the uniform values in our JavaScript side Float32Array
    const aspect = canvas.width / canvas.height;
    objectInfos.forEach(({ scale }, index) => {
      const offset = index * (changingUnitSize / 4);
      storageValues.set([scale / aspect, scale], offset + kScaleOffset);
    });

    device.queue.writeBuffer(changingStorageBuffer, 0, storageValues);

    pass.setBindGroup(0, bindGroup);
    pass.draw(numVertices, kNumObjects);

    pass.end();
    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  };

  render();
};
export const StorageBuffer: React.FC = () => {
  return (
    <div className="flex">
      <WebGpuTemplate render={renderTriangle1} />
      <WebGpuTemplate render={renderTriangle2} />
    </div>
  );
};

export default StorageBuffer;
