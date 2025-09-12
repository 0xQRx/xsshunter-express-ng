import { EditorView } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

// Base16 Dark color scheme
const base16Colors = {
  background: '#151515',
  foreground: '#e0e0e0',
  selection: '#303030',
  cursor: '#b0b0b0',
  gutterBackground: '#151515',
  gutterForeground: '#505050',
  lineHighlight: '#202020',
  
  // Syntax colors
  comment: '#8f5536',
  red: '#ac4142',
  orange: '#d28445',
  yellow: '#f4bf75',
  green: '#90a959',
  cyan: '#75b5aa',
  blue: '#6a9fb5',
  purple: '#aa759f',
  brown: '#8f5536'
}

// Define the editor theme
const base16DarkTheme = EditorView.theme({
  '&': {
    color: base16Colors.foreground,
    backgroundColor: '#161b22'
  },
  '.cm-content': {
    caretColor: base16Colors.cursor
  },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: base16Colors.cursor },
  '&.cm-focused .cm-selectionBackground, ::selection': {
    backgroundColor: 'rgba(255, 255, 255, 0.08) !important'  // Subtle when focused
  },
  '.cm-selectionBackground': {
    backgroundColor: 'rgba(255, 255, 255, 0.05) !important'  // Even more subtle when not focused
  },
  '.cm-content ::selection': {
    backgroundColor: 'rgba(255, 255, 255, 0.08) !important'
  },
  '&.cm-focused .cm-selectionLayer .cm-selectionBackground': {
    backgroundColor: 'rgba(255, 255, 255, 0.08) !important'
  },
  '.cm-panels': { backgroundColor: 'transparent', color: base16Colors.foreground },
  '.cm-panels.cm-panels-top': { borderBottom: '2px solid black' },
  '.cm-panels.cm-panels-bottom': { borderTop: '2px solid black' },
  '.cm-searchMatch': {
    backgroundColor: '#72a1ff59',
    outline: '1px solid #457dff'
  },
  '.cm-searchMatch.cm-searchMatch-selected': {
    backgroundColor: '#6199ff2f'
  },
  '.cm-activeLine': { backgroundColor: '#202020' },
  '.cm-selectionMatch': { backgroundColor: '#aafe661a' },
  '&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket': {
    textDecoration: 'underline',
    color: '#ffffff !important'
  },
  '.cm-gutters': {
    backgroundColor: '#0d1117',
    color: 'rgba(255, 255, 255, 0.3)',
    borderRight: '1px solid rgba(255, 255, 255, 0.1)'
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#0d1117'
  },
  '.cm-foldPlaceholder': {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#ddd'
  },
  '.cm-tooltip': {
    border: 'none',
    backgroundColor: '#27293d'
  },
  '.cm-tooltip .cm-tooltip-arrow:before': {
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent'
  },
  '.cm-tooltip .cm-tooltip-arrow:after': {
    borderTopColor: '#27293d',
    borderBottomColor: '#27293d'
  },
  '.cm-tooltip-autocomplete': {
    '& > ul > li[aria-selected]': {
      backgroundColor: base16Colors.lineHighlight,
      color: base16Colors.foreground
    }
  }
}, { dark: true })

// Define the syntax highlighting style
const base16DarkHighlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: base16Colors.red },
  { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: base16Colors.green },
  { tag: [t.function(t.variableName), t.labelName], color: base16Colors.blue },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: base16Colors.orange },
  { tag: [t.definition(t.name), t.separator], color: base16Colors.foreground },
  {
    tag: [
      t.typeName,
      t.className,
      t.number,
      t.changed,
      t.annotation,
      t.modifier,
      t.self,
      t.namespace
    ],
    color: base16Colors.purple
  },
  {
    tag: [
      t.operator,
      t.operatorKeyword,
      t.url,
      t.escape,
      t.regexp,
      t.link,
      t.special(t.string)
    ],
    color: base16Colors.cyan
  },
  { tag: t.comment, color: base16Colors.comment },
  { tag: t.meta, color: base16Colors.brown },
  { tag: t.strong, fontWeight: 'bold' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: t.link, color: base16Colors.purple, textDecoration: 'underline' },
  { tag: t.heading, fontWeight: 'bold', color: base16Colors.green },
  { tag: [t.atom, t.bool, t.special(t.variableName)], color: base16Colors.purple },
  { tag: [t.processingInstruction, t.string, t.inserted], color: base16Colors.yellow },
  { tag: t.invalid, color: base16Colors.cursor, backgroundColor: base16Colors.red }
])

// Export the complete theme extension
export const base16Dark: Extension = [
  base16DarkTheme,
  syntaxHighlighting(base16DarkHighlightStyle)
]