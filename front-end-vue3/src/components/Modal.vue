<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div class="modal fade"
           @click.self="handleBackdropClick"
           :class="[{'show d-block': modelValue}, {'d-none': !modelValue}, {'modal-mini': type === 'mini'}]"
           v-show="modelValue"
           tabindex="-1"
           role="dialog"
           :aria-hidden="!modelValue">

        <div class="modal-dialog"
             :class="[{'modal-notice': type === 'notice'}, {'modal-dialog-centered': centered}, modalClasses]">
          <div class="modal-content" :class="[gradient ? `bg-gradient-${gradient}` : '', modalContentClasses]">

            <div class="modal-header" :class="[headerClasses]" v-if="$slots.header">
              <slot name="header"></slot>
              <slot name="close-button">
                <button type="button"
                        class="close"
                        v-if="showClose"
                        @click="closeModal"
                        data-dismiss="modal"
                        aria-label="Close">
                  <i class="tim-icons icon-simple-remove"></i>
                </button>
              </slot>
            </div>

            <div v-if="$slots.default" class="modal-body" :class="bodyClasses">
              <slot></slot>
            </div>

            <div class="modal-footer" :class="footerClasses" v-if="$slots.footer">
              <slot name="footer"></slot>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { watch, onMounted, onUnmounted } from 'vue'

defineOptions({
  name: 'Modal'
})

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  showClose: {
    type: Boolean,
    default: true
  },
  clickOut: {
    type: Boolean,
    default: true,
    description: "Whether clicking outside the modal should close it"
  },
  centered: {
    type: Boolean,
    default: true
  },
  type: {
    type: String,
    default: "",
    validator(value: string) {
      let acceptedValues = ["", "notice", "mini"]
      return acceptedValues.indexOf(value) !== -1
    },
    description: 'Modal type (notice|mini|"") '
  },
  modalClasses: {
    type: [Object, String],
    default: '',
    description: "Modal dialog css classes"
  },
  modalContentClasses: {
    type: [Object, String],
    default: '',
    description: "Modal dialog content css classes"
  },
  gradient: {
    type: String,
    default: '',
    description: "Modal gradient type (danger, primary etc)"
  },
  headerClasses: {
    type: [Object, String],
    default: '',
    description: "Modal Header css classes"
  },
  bodyClasses: {
    type: [Object, String],
    default: '',
    description: "Modal Body css classes"
  },
  footerClasses: {
    type: [Object, String],
    default: '',
    description: "Modal Footer css classes"
  }
})

const emit = defineEmits(['update:modelValue', 'close'])

const closeModal = () => {
  emit('update:modelValue', false)
  emit('close')
}

const handleBackdropClick = () => {
  if (props.clickOut) {
    closeModal()
  }
}

// Handle body class for modal-open
watch(() => props.modelValue, (val) => {
  let documentClasses = document.body.classList
  if (val) {
    documentClasses.add("modal-open")
  } else {
    documentClasses.remove("modal-open")
  }
})

// Clean up on unmount
onUnmounted(() => {
  document.body.classList.remove("modal-open")
})
</script>

<style scoped>
.modal.show {
  background-color: rgba(0, 0, 0, 0.3);
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

/* Make modals wider by default */
.modal-dialog {
  max-width: 1050px;
}

.modal-dialog-centered {
  min-height: calc(100% - 1rem);
}

/* Extra large modal */
.modal-xl .modal-dialog {
  max-width: 90%;
  width: 90%;
}

@media (min-width: 1200px) {
  .modal-xl .modal-dialog {
    max-width: 1600px;
  }
}
</style>