/* EcoNote 편집기 번들 진입점 — Tiptap v3 를 한 파일(IIFE, 전역 EcoTiptap)로 묶는다.
   빌드: npm run build  →  sites/net/public/work/notes/econote-editor.js  (바꾸면 index.html 의 ?v=N 을 올릴 것) */
import { Editor, Node, Extension, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { StarterKit } from '@tiptap/starter-kit';
import { Image } from '@tiptap/extension-image';
import { Youtube, isValidYoutubeUrl } from '@tiptap/extension-youtube';
import { TaskList, TaskItem } from '@tiptap/extension-list';
import { TableKit } from '@tiptap/extension-table';
import { Placeholder, CharacterCount, Focus } from '@tiptap/extensions';
import { Highlight } from '@tiptap/extension-highlight';
import { TextStyle, Color, BackgroundColor } from '@tiptap/extension-text-style';
import { TextAlign } from '@tiptap/extension-text-align';
import { Details, DetailsSummary, DetailsContent } from '@tiptap/extension-details';
import { DragHandle } from '@tiptap/extension-drag-handle';
import { Markdown } from '@tiptap/markdown';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { offset, shift } from '@floating-ui/dom';

/* 서버 저장 이미지: src 는 서명 URL(수명 있음)이라 저장하지 않고, 버킷 경로(path)만 문서에 남긴다.
   불러올 때 path → 서명 URL 로 다시 채운다(페이지 쪽 resolveImages). width 는 % 또는 px. */
const EcoImage = Image.extend({
  name: 'image',
  addAttributes() {
    return {
      ...this.parent?.(),
      path: { default: null, parseHTML: el => el.getAttribute('data-path'), renderHTML: a => (a.path ? { 'data-path': a.path } : {}) },
      width: { default: null, parseHTML: el => el.getAttribute('width') || el.style.width || null, renderHTML: a => (a.width ? { width: a.width, style: 'width:' + a.width } : {}) },
      align: { default: null, parseHTML: el => el.getAttribute('data-align'), renderHTML: a => (a.align ? { 'data-align': a.align } : {}) },
    };
  },
});

/* 콜아웃(강조 상자) — Notion 의 callout. 아이콘 + 색상 */
const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,
  addAttributes() {
    return {
      icon: { default: '💡', parseHTML: el => el.getAttribute('data-icon') || '💡', renderHTML: a => ({ 'data-icon': a.icon }) },
      tone: { default: 'info', parseHTML: el => el.getAttribute('data-tone') || 'info', renderHTML: a => ({ 'data-tone': a.tone }) },
    };
  },
  parseHTML() { return [{ tag: 'div[data-callout]' }]; },
  renderHTML({ HTMLAttributes }) { return ['div', mergeAttributes({ 'data-callout': '' }, HTMLAttributes), ['span', { class: 'co-icon', contenteditable: 'false' }, HTMLAttributes['data-icon']], ['div', { class: 'co-body' }, 0]]; },
  addCommands() {
    return {
      setCallout: attrs => ({ commands }) => commands.wrapIn(this.name, attrs),
      toggleCallout: attrs => ({ commands }) => commands.toggleWrap(this.name, attrs),
      unsetCallout: () => ({ commands }) => commands.lift(this.name),
    };
  },
});

/* 첨부 파일 카드(엑셀·CSV·PDF) — 파일은 버킷에, 문서엔 path·이름·크기만. 버튼 동작은 페이지 쪽 handleClick 이 [data-file-act] 로 받는다 */
function fmtSize(n) { n = +n || 0; return n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(0) + ' KB' : (n / 1048576).toFixed(1) + ' MB'; }
function fileIcon(name, mime) { var e = String(name || '').toLowerCase(); if (/\.(xlsx|xls|xlsm)$/.test(e) || /spreadsheet|ms-excel/.test(mime || '')) return '📊'; if (/\.csv$/.test(e) || /csv/.test(mime || '')) return '📑'; if (/\.pdf$/.test(e)) return '📕'; return '📎'; }
const FileBlock = Node.create({
  name: 'fileBlock',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return {
      path: { default: null, parseHTML: el => el.getAttribute('data-path') },
      name: { default: '', parseHTML: el => el.getAttribute('data-name') || '' },
      size: { default: 0, parseHTML: el => +el.getAttribute('data-size') || 0 },
      mime: { default: '', parseHTML: el => el.getAttribute('data-mime') || '' },
    };
  },
  parseHTML() { return [{ tag: 'div[data-file]' }]; },
  renderHTML({ node }) {
    const a = node.attrs, sheet = /\.(xlsx|xls|xlsm|csv)$/i.test(a.name || '');
    return ['div', { 'data-file': '', 'data-path': a.path, 'data-name': a.name, 'data-size': a.size, 'data-mime': a.mime, class: 'file-card', contenteditable: 'false' },
      ['span', { class: 'fc-icon' }, fileIcon(a.name, a.mime)],
      ['span', { class: 'fc-meta' }, ['span', { class: 'fc-name' }, a.name || '파일'], ['span', { class: 'fc-size' }, fmtSize(a.size) + (sheet ? ' · 엑셀' : '')]],
      ['span', { class: 'fc-act' },
        ...(sheet ? [['button', { type: 'button', 'data-file-act': 'open' }, '열기'], ['button', { type: 'button', 'data-file-act': 'table' }, '표로 넣기']] : [['button', { type: 'button', 'data-file-act': 'view' }, '보기']]),
        ['button', { type: 'button', 'data-file-act': 'dl' }, '내려받기']]];
  },
  addCommands() { return { setFileBlock: attrs => ({ commands }) => commands.insertContent({ type: this.name, attrs }) }; },
  renderMarkdown: (node) => '[' + (node.attrs && node.attrs.name || '파일') + ']',
});

export { Editor, Node, Extension, Plugin, PluginKey, mergeAttributes, FileBlock,
  StarterKit, EcoImage as Image, Youtube, isValidYoutubeUrl, TaskList, TaskItem, TableKit, Placeholder, CharacterCount, Focus,
  Highlight, TextStyle, Color, BackgroundColor, TextAlign, Details, DetailsSummary, DetailsContent, DragHandle, Markdown, Subscript, Superscript, Callout, offset, shift };
