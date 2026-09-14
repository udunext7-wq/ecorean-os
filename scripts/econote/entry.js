/* EcoNote 편집기 번들 진입점 — Tiptap v3 를 한 파일(IIFE, 전역 EcoTiptap)로 묶는다.
   빌드: npm run build  →  sites/net/public/work/notes/econote-editor.js */
import { Editor, Node, Extension, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { StarterKit } from '@tiptap/starter-kit';
import { Image } from '@tiptap/extension-image';
import { Youtube, isValidYoutubeUrl } from '@tiptap/extension-youtube';
import { TaskList, TaskItem } from '@tiptap/extension-list';
import { TableKit } from '@tiptap/extension-table';
import { Placeholder, CharacterCount } from '@tiptap/extensions';

/* 서버 저장 이미지: src 는 서명 URL(수명 있음)이라 저장하지 않고, 버킷 경로(path)만 문서에 남긴다.
   불러올 때 path → 서명 URL 로 다시 채운다(페이지 쪽 resolveImages). */
const EcoImage = Image.extend({
  name: 'image',
  addAttributes() {
    return {
      ...this.parent?.(),
      path: { default: null, parseHTML: el => el.getAttribute('data-path'), renderHTML: a => (a.path ? { 'data-path': a.path } : {}) },
      width: { default: null, parseHTML: el => el.getAttribute('width'), renderHTML: a => (a.width ? { width: a.width } : {}) },
    };
  },
});

export { Editor, Node, Extension, Plugin, PluginKey, mergeAttributes,
  StarterKit, EcoImage as Image, Youtube, isValidYoutubeUrl, TaskList, TaskItem, TableKit, Placeholder, CharacterCount };
