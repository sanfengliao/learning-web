import { WebGpuTemplate } from '../../../components/WebGpuTemplate';
import { rand } from '../../../utils';

function createCircleVertices({
  radius = 1,
  numSubdivisions = 24,
  innerRadius = 0,
  startAngle = 0,
  endAngle = Math.PI * 2,
} = {}) {
  // 2 triangles per subdivision, 3 verts per tri, 2 values (xy) each.
  const numVertices = numSubdivisions * 3 * 2;
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

function createCircleVertices2({
  radius = 1,
  numSubdivisions = 24,
  innerRadius = 0,
  startAngle = 0,
  endAngle = Math.PI * 2,
} = {}) {
  // 2 triangles per subdivision, 3 verts per tri, 5 values (xyrgb) each.
  const numVertices = numSubdivisions * 3 * 2;
  const vertexData = new Float32Array(numVertices * (2 + 3));

  let offset = 0;
  const addVertex = (x: number, y: number, r: number, g: number, b: number) => {
    vertexData[offset++] = x;
    vertexData[offset++] = y;
    vertexData[offset++] = r;
    vertexData[offset++] = g;
    vertexData[offset++] = b;
  };

  const innerColor = [1, 1, 1] as const;
  const outerColor = [0.1, 0.1, 0.1] as const;

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
    addVertex(c1 * radius, s1 * radius, ...outerColor);
    addVertex(c2 * radius, s2 * radius, ...outerColor);
    addVertex(c1 * innerRadius, s1 * innerRadius, ...innerColor);

    // second triangle
    addVertex(c1 * innerRadius, s1 * innerRadius, ...innerColor);
    addVertex(c2 * radius, s2 * radius, ...outerColor);
    addVertex(c2 * innerRadius, s2 * innerRadius, ...innerColor);
  }

  return {
    vertexData,
    numVertices,
  };
}

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

      struct Vertex {
        @location(0) position: vec2f,
      };





      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) color: vec4f,
      };

      @group(0) @binding(0) var<storage, read> ourStructs: array<OurStruct>;
      @group(0) @binding(1) var<storage, read> otherStructs: array<OtherStruct>;
      @group(0) @binding(2) var<storage, read> pos: array<Vertex>;


      @vertex fn vs(
        vert: Vertex,
        @builtin(instance_index) instanceIndex: u32
      ) -> VSOutput {
        let otherStruct = otherStructs[instanceIndex];
        let ourStruct = ourStructs[instanceIndex];

        var vsOut: VSOutput;
        vsOut.position = vec4f(
            vert.position * otherStruct.scale + ourStruct.offset, 0.0, 1.0);
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
      buffers: [
        {
          arrayStride: 4 * 2,
          attributes: [
            {
              shaderLocation: 0,
              offset: 0,
              format: 'float32x2',
            },
          ],
        },
      ],
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
    label: 'vertex buffer vertices',
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
    label: 'vertext buffer vertices',
    size: vertexData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
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
    pass.setVertexBuffer(0, vertexStorageBuffer);

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

const renderTriangle2 = (device: GPUDevice, context: GPUCanvasContext, canvas: HTMLCanvasElement) => {
  const presentationFormant = navigator.gpu.getPreferredCanvasFormat();
  const module = device.createShaderModule({
    label: 'our hardcoded rgba triangle shaders',
    code: `
      struct Vertex {
        @location(0) position: vec2f,
        @location(1) color: vec4f,
        @location(2) offset: vec2f,
        @location(3) scale: vec2f,
      };

      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) color: vec4f,
      };




      @vertex fn vs(
        vert: Vertex,

      ) -> VSOutput {
          var vsOut: VSOutput;
        vsOut.position = vec4f(
            vert.position * vert.scale + vert.offset, 0.0, 1.0);
        vsOut.color = vert.color;
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
      buffers: [
        {
          arrayStride: 4 * 2,
          attributes: [
            {
              shaderLocation: 0,
              offset: 0,
              format: 'float32x2',
            },
          ],
        },
        {
          arrayStride: 6 * 4,
          stepMode: 'instance',
          attributes: [
            {
              shaderLocation: 1,
              offset: 0,
              format: 'float32x4',
            },
            {
              shaderLocation: 2,
              offset: 16,
              format: 'float32x2',
            },
          ],
        },
        {
          arrayStride: 2 * 4,
          stepMode: 'instance',
          attributes: [
            {
              shaderLocation: 3,
              offset: 0,
              format: 'float32x2',
            },
          ],
        },
      ],
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

  const staticUnitSize = 4 * 4 + 4 * 2;

  const changingUnitSize = 4 * 2;

  const kNumObjects = 100;
  const objectInfos: {
    scale: number;
  }[] = [];

  const staticVertexBufferSize = staticUnitSize * kNumObjects;
  const changingVertextBufferSize = changingUnitSize * kNumObjects;

  const staticVertexBuffer = device.createBuffer({
    label: 'static vertext for object',
    size: staticVertexBufferSize,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  const changingVertexBuffer = device.createBuffer({
    label: 'changing storage for objects',
    size: changingVertextBufferSize,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  const kColorOffset = 0;
  const kOffsetOffset = 4;
  const kScaleOffset = 0;

  const staticStorageValues = new Float32Array(staticVertexBufferSize / 4);

  for (let i = 0; i < kNumObjects; ++i) {
    const staticOffset = i * (staticUnitSize / 4);
    staticStorageValues.set([rand(), rand(), rand(), 1], staticOffset + kColorOffset);
    staticStorageValues.set([rand(-0.9, 0.9), rand(-0.9, 0.9)], staticOffset + kOffsetOffset);
    objectInfos.push({
      scale: rand(0.2, 0.5),
    });
  }

  device.queue.writeBuffer(staticVertexBuffer, 0, staticStorageValues);

  const { vertexData, numVertices } = createCircleVertices({
    radius: 0.5,
    innerRadius: 0.25,
  });

  const vertexStorageBuffer = device.createBuffer({
    label: 'vertext buffer vertices',
    size: vertexData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(vertexStorageBuffer, 0, vertexData);

  // a typed array we can use to update the changingStorageBuffer
  const storageValues = new Float32Array(changingVertextBufferSize / 4);

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
    pass.setVertexBuffer(0, vertexStorageBuffer);
    pass.setVertexBuffer(1, staticVertexBuffer);
    pass.setVertexBuffer(2, changingVertexBuffer);

    // Set the uniform values in our JavaScript side Float32Array
    const aspect = canvas.width / canvas.height;
    objectInfos.forEach(({ scale }, index) => {
      const offset = index * (changingUnitSize / 4);
      storageValues.set([scale / aspect, scale], offset + kScaleOffset);
    });

    device.queue.writeBuffer(changingVertexBuffer, 0, storageValues);

    pass.draw(numVertices, kNumObjects);

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
      struct Vertex {
        @location(0) position: vec2f,
        @location(1) color: vec4f,
        @location(2) offset: vec2f,
        @location(3) scale: vec2f,
        @location(4) perVertexColor: vec3f,
      };

      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) color: vec4f,
      };




      @vertex fn vs(
        vert: Vertex,

      ) -> VSOutput {
          var vsOut: VSOutput;
        vsOut.position = vec4f(
            vert.position * vert.scale + vert.offset, 0.0, 1.0);
        vsOut.color = vert.color * vec4f(vert.perVertexColor, 1);
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
      buffers: [
        {
          arrayStride: 4 * 5,
          attributes: [
            {
              shaderLocation: 0,
              offset: 0,
              format: 'float32x2',
            }, // position
            {
              shaderLocation: 4,
              offset: 8,
              format: 'float32x3',
            }, // perVertexColor
          ],
        },
        {
          arrayStride: 6 * 4,
          stepMode: 'instance',
          attributes: [
            {
              shaderLocation: 1,
              offset: 0,
              format: 'float32x4',
            }, // color
            {
              shaderLocation: 2,
              offset: 16,
              format: 'float32x2',
            }, // offset
          ],
        },
        {
          arrayStride: 2 * 4,
          stepMode: 'instance',
          attributes: [
            {
              shaderLocation: 3,
              offset: 0,
              format: 'float32x2',
            }, // scale
          ],
        },
      ],
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

  const staticUnitSize = 4 * 4 + 4 * 2;

  const changingUnitSize = 4 * 2;

  const kNumObjects = 100;
  const objectInfos: {
    scale: number;
  }[] = [];

  const staticVertexBufferSize = staticUnitSize * kNumObjects;
  const changingVertextBufferSize = changingUnitSize * kNumObjects;

  const staticVertexBuffer = device.createBuffer({
    label: 'static vertext for object',
    size: staticVertexBufferSize,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  const changingVertexBuffer = device.createBuffer({
    label: 'changing storage for objects',
    size: changingVertextBufferSize,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  const kColorOffset = 0;
  const kOffsetOffset = 4;
  const kScaleOffset = 0;

  const staticStorageValues = new Float32Array(staticVertexBufferSize / 4);

  for (let i = 0; i < kNumObjects; ++i) {
    const staticOffset = i * (staticUnitSize / 4);
    staticStorageValues.set([rand(), rand(), rand(), 1], staticOffset + kColorOffset);
    staticStorageValues.set([rand(-0.9, 0.9), rand(-0.9, 0.9)], staticOffset + kOffsetOffset);
    objectInfos.push({
      scale: rand(0.2, 0.5),
    });
  }

  device.queue.writeBuffer(staticVertexBuffer, 0, staticStorageValues);

  const { vertexData, numVertices } = createCircleVertices2({
    radius: 0.5,
    innerRadius: 0.25,
  });

  const vertexStorageBuffer = device.createBuffer({
    label: 'vertext buffer vertices',
    size: vertexData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(vertexStorageBuffer, 0, vertexData);

  // a typed array we can use to update the changingStorageBuffer
  const storageValues = new Float32Array(changingVertextBufferSize / 4);

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
    pass.setVertexBuffer(0, vertexStorageBuffer);
    pass.setVertexBuffer(1, staticVertexBuffer);
    pass.setVertexBuffer(2, changingVertexBuffer);

    // Set the uniform values in our JavaScript side Float32Array
    const aspect = canvas.width / canvas.height;
    objectInfos.forEach(({ scale }, index) => {
      const offset = index * (changingUnitSize / 4);
      storageValues.set([scale / aspect, scale], offset + kScaleOffset);
    });

    device.queue.writeBuffer(changingVertexBuffer, 0, storageValues);

    pass.draw(numVertices, kNumObjects);

    pass.end();
    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  };

  render();
};

export const VertexBuffer: React.FC = () => {
  return (
    <div className="flex">
      <WebGpuTemplate render={renderTriangle1} />
      <WebGpuTemplate render={renderTriangle2} />
      <WebGpuTemplate render={renderTriangle3} />
    </div>
  );
};

export default VertexBuffer;
