import {Framebuffer, Texture2D, withParameters} from '@luma.gl/core';
import {OPERATION} from '../lib/constants';
import LayersPass from './layers-pass';

import type {LayersPassRenderOptions} from './layers-pass';

type CollidePassRenderOptions = LayersPassRenderOptions & {};

export default class CollidePass extends LayersPass {
  collideMap: Texture2D;
  fbo: Framebuffer;

  constructor(gl, props: {id: string; mapSize?: number}) {
    super(gl, props);

    const {mapSize = 2048} = props;

    this.collideMap = new Texture2D(gl, {
      width: mapSize,
      height: mapSize,
      parameters: {
        [gl.TEXTURE_MIN_FILTER]: gl.LINEAR,
        [gl.TEXTURE_MAG_FILTER]: gl.LINEAR,
        [gl.TEXTURE_WRAP_S]: gl.CLAMP_TO_EDGE,
        [gl.TEXTURE_WRAP_T]: gl.CLAMP_TO_EDGE
      }
    });

    this.fbo = new Framebuffer(gl, {
      id: 'collidemap',
      width: mapSize,
      height: mapSize,
      attachments: {
        [gl.COLOR_ATTACHMENT0]: this.collideMap
      }
    });
  }

  render(options: CollidePassRenderOptions) {
    const gl = this.gl;

    const colorMask = [true, true, true, true];
    // colorMask[options.channel] = true;

    return withParameters(
      gl,
      {
        clearColor: [0, 0, 0, 0],
        blend: false,
        // blendFunc: [gl.ZERO, gl.ONE],
        // blendEquation: gl.FUNC_SUBTRACT,
        colorMask,
        depthTest: false // TODO Perhaps true to allow correct sorting between layers
      },
      () => super.render({...options, target: this.fbo, pass: 'mask'})
    );
  }

  shouldDrawLayer(layer) {
    return layer.props.operation === OPERATION.COLLIDE;
  }

  delete() {
    this.fbo.delete();
    this.collideMap.delete();
  }
}
