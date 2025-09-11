<template>
  <div ref="editorElement" class="code-editor"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { EditorView, basicSetup } from 'codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { html } from '@codemirror/lang-html'
import { base16Dark } from '@/utils/base16-dark-theme'

const props = withDefaults(defineProps<{
  modelValue: string
  readonly?: boolean
  language?: 'javascript' | 'html' | 'json'
}>(), {
  readonly: false,
  language: 'javascript'
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const editorElement = ref<HTMLElement>()
let editor: EditorView | null = null

onMounted(() => {
  if (!editorElement.value) return
  
  const langExtension = props.language === 'html' ? html() : javascript()
  
  editor = new EditorView({
    doc: props.modelValue || '',
    extensions: [
      basicSetup,
      langExtension,
      base16Dark,
      EditorView.editable.of(!props.readonly),
      EditorView.updateListener.of(update => {
        if (update.docChanged && !props.readonly) {
          emit('update:modelValue', update.state.doc.toString())
        }
      })
    ],
    parent: editorElement.value
  })
})

watch(() => props.modelValue, (newValue) => {
  if (editor && newValue !== editor.state.doc.toString()) {
    editor.dispatch({
      changes: {
        from: 0,
        to: editor.state.doc.length,
        insert: newValue
      }
    })
  }
})
</script>

<style lang="scss">
.code-editor {
  .cm-editor {
    height: 400px;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    background: #161b22 !important;
    color: #f8f8f2 !important;
    border-radius: 4px;
    overflow: hidden; // Ensure child elements don't overflow rounded corners
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace;
    font-size: 13px;
    
    &.cm-focused {
      outline: none;
    }
  }
  
  // Ensure gutters respect border radius
  .cm-gutters {
    border-radius: 4px 0 0 4px;
  }
  
  .cm-lineNumbers .cm-gutterElement {
    color: rgba(255, 255, 255, 0.3) !important;
    padding: 0 3px 0 5px;
  }
  
  .cm-cursor {
    border-left: 1px solid #f8f8f2 !important;
  }
}

// Fixed height for modal editors (PayloadConsole)
.payload-code-editor {
  .cm-editor {
    height: 400px !important;
  }
  
  .cm-scroller {
    height: 100% !important;
    overflow-y: auto !important;
  }
}

// Theme overrides for XSS report CodeMirror
.xss-report-codemirror {
  .cm-editor {
    height: 400px !important;
    max-height: 400px !important;
  }
  
  .cm-scroller {
    max-height: 400px !important;
    overflow-y: auto !important;
  }
}

// Ensure scrollbars match theme
.cm-editor {
  .cm-scroller {
    &::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    
    &::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
    }
    
    &::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      
      &:hover {
        background: rgba(255, 255, 255, 0.3);
      }
    }
  }
}
</style>