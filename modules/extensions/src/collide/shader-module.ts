import {project} from '@deck.gl/core';
import type {_ShaderModule as ShaderModule} from '@deck.gl/core';
import type {Texture2D} from '@luma.gl/webgl';

const vs = `
#ifdef NON_INSTANCED_MODEL
attribute float collidePriorities;
#else
attribute float instanceCollidePriorities;
#endif

uniform bool collide_sort;

vec2 collide_getCoords(vec4 position) {
  vec4 collide_clipspace = project_common_position_to_clipspace(position);
  return (1.0 + collide_clipspace.xy / collide_clipspace.w) / 2.0;
}
`;

const fs = `
uniform sampler2D collide_texture;
uniform bool collide_enabled;

float match(vec2 tex, vec3 pickingColor) {
  vec4 collide_pickingColor = texture2D(collide_texture, tex);
  float delta = distance(collide_pickingColor.rgb, pickingColor);
  float e = 0.000001;
  return step(delta, e);
}

float collide_isInBounds(vec2 texCoords, vec3 pickingColor) {
  if (!collide_enabled) {
    return 1.0;
  }

  float O = 0.0;
  vec2 dx = 2.0 * vec2(1.0 / 2048.0, 0.0);
  vec2 dy = dx.yx;

  // Visibility test
  vec2 dd = -2.0 * dy;
  O += match(texCoords + 2.0 * dx + dd, pickingColor);
  O += match(texCoords + dx + dd , pickingColor);
  O += match(texCoords + dd, pickingColor);
  O += match(texCoords - dx + dd, pickingColor);
  O += match(texCoords - 2.0 * dx + dd, pickingColor);

  dd = -1.0 * dy;
  O += match(texCoords + 2.0 * dx + dd, pickingColor);
  O += match(texCoords + dx + dd , pickingColor);
  O += match(texCoords + dd, pickingColor);
  O += match(texCoords - dx + dd, pickingColor);
  O += match(texCoords - 2.0 * dx + dd, pickingColor);

  dd = 0.0 * dy;
  O += match(texCoords + 2.0 * dx + dd, pickingColor);
  O += match(texCoords + dx + dd , pickingColor);
  O += match(texCoords + dd, pickingColor);
  O += match(texCoords - dx + dd, pickingColor);
  O += match(texCoords - 2.0 * dx + dd, pickingColor);

  dd = 1.0 * dy;
  O += match(texCoords + 2.0 * dx + dd, pickingColor);
  O += match(texCoords + dx + dd , pickingColor);
  O += match(texCoords + dd, pickingColor);
  O += match(texCoords - dx + dd, pickingColor);
  O += match(texCoords - 2.0 * dx + dd, pickingColor);

  dd = 2.0 * dy;
  O += match(texCoords + 2.0 * dx + dd, pickingColor);
  O += match(texCoords + dx + dd , pickingColor);
  O += match(texCoords + dd, pickingColor);
  O += match(texCoords - dx + dd, pickingColor);
  O += match(texCoords - 2.0 * dx + dd, pickingColor);

  O = O / 25.0;

  return pow(O, 2.2);
}
`;

const inject = {
  'vs:#decl': `
varying vec2 collide_texCoords;
varying vec3 collide_pickingColor;
`,
  'vs:#main-end': `
   vec4 collide_common_position = project_position(vec4(geometry.worldPosition, 1.0));
   collide_texCoords = collide_getCoords(collide_common_position);
   collide_pickingColor = geometry.pickingColor / 255.0;
`,
  'vs:DECKGL_FILTER_GL_POSITION': `
   if (collide_sort) {
     #ifdef NON_INSTANCED_MODEL
     float collidePriority = collidePriorities;
     #else
     float collidePriority = instanceCollidePriorities;
     #endif
     position.z = 0.001 * collidePriority * position.w; // Support range -1000 -> 1000
   }
  `,
  'fs:#decl': `
varying vec2 collide_texCoords;
varying vec3 collide_pickingColor;
`,
  'fs:#main-end': `
  if (collide_enabled) {
    float collide_visible = collide_isInBounds(collide_texCoords, collide_pickingColor);

    // Debug: show extent of render target
    // gl_FragColor = vec4(collide_texCoords, 0.0, 1.0);
    // if (collide_texCoords.x > 0.99 || collide_texCoords.x < 0.01 || collide_texCoords.y > 0.99 || collide_texCoords.y < 0.01) {
    //   gl_FragColor.b = 1.0;
    // }
    // gl_FragColor = texture2D(collide_texture, collide_texCoords);

    // Fade out
    gl_FragColor.a *= collide_visible;
    if (collide_visible < 0.01) discard;
  }
`
};

export default {
  name: 'collide-read',
  dependencies: [project],
  vs,
  fs,
  inject
} as ShaderModule;