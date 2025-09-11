<template>
  <div>
    <div class="row">
      <div class="col-12">
        <Card class="card-plain">
          <div class="card-header">
            <div class="row">
              <div class="col-6">
                <h1 class="card-title">Payload Console</h1>
              </div>
              <div class="col-6 text-right">
                <BaseButton @click="showNewPayloadModal" type="primary" size="sm">
                  <i class="fa fa-plus"></i> New Payload
                </BaseButton>
              </div>
            </div>
          </div>
          <div class="card-body">
            <!-- Payloads List -->
            <div v-if="payloads.length === 0" class="text-center text-muted">
              <p>No payloads created yet. Click "New Payload" to get started!</p>
            </div>
            
            <div v-else class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="payload in payloads" :key="payload.id">
                    <td class="payload-name">{{ payload.name }}</td>
                    <td class="payload-description">{{ payload.description || 'No description' }}</td>
                    <td class="payload-status">
                      <span :class="['badge', payload.is_active ? 'badge-success' : 'badge-secondary']">
                        {{ payload.is_active ? 'Active' : 'Inactive' }}
                      </span>
                    </td>
                    <td class="payload-date">{{ formatDate(payload.created_at) }}</td>
                    <td class="payload-actions">
                      <button @click="editPayload(payload)" class="btn btn-sm btn-info mr-2" title="Edit">
                        <i class="fa fa-edit"></i>
                      </button>
                      <button @click="togglePayloadStatus(payload)" :class="['btn', 'btn-sm', 'mr-2', payload.is_active ? 'btn-warning' : 'btn-success']" :title="payload.is_active ? 'Deactivate' : 'Activate'">
                        <i :class="['fa', payload.is_active ? 'fa-pause' : 'fa-play']"></i>
                      </button>
                      <button @click="deletePayload(payload)" class="btn btn-sm btn-danger" title="Delete">
                        <i class="fa fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </div>
    </div>

    <!-- Edit/Create Payload Modal -->
    <Modal 
      v-model="showModal"
      :show-close="true"
      :centered="true"
      :click-out="false"
      header-classes="justify-content-center"
      type=""
      modal-classes="modal-xl modal-black">
      <template #header>
        <h4 class="modal-title">{{ editingPayload ? 'Edit Payload' : 'New Payload' }}</h4>
      </template>
      
      <div class="form-group">
        <label>Name *</label>
        <BaseInput v-model="currentPayload.name" type="text" placeholder="My Custom Payload" />
      </div>
      
      <div class="form-group">
        <label>Description</label>
        <textarea v-model="currentPayload.description" class="form-control" rows="2" placeholder="Brief description of what this payload does"></textarea>
      </div>
      
      <div class="form-group">
        <label>JavaScript Code *</label>
        <CodeEditor
          v-model="currentPayload.code"
          language="javascript"
          class="payload-code-editor"
        />
        <small class="form-text text-muted">
          This code will be executed when the XSS payload fires. You have access to all DOM APIs and the captured context.
        </small>
      </div>
      
      <div class="form-group">
        <div class="form-check">
          <label class="form-check-label">
            <input v-model="currentPayload.is_active" type="checkbox" class="form-check-input">
            <span class="form-check-sign"></span>
            <span>Activate this payload (will be executed on XSS fires)</span>
          </label>
        </div>
      </div>
      
      <template #footer>
        <BaseButton @click="closeModal" type="secondary">Cancel</BaseButton>
        <BaseButton @click="testCurrentPayload" type="info" :disabled="!currentPayload.code">
          <i class="fa fa-flask"></i> Test
        </BaseButton>
        <BaseButton @click="savePayload" type="success" :disabled="!isValidPayload">
          <i class="fa fa-save"></i> {{ editingPayload ? 'Update' : 'Create' }}
        </BaseButton>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Card from '@/components/Cards/Card.vue'
import BaseButton from '@/components/BaseButton.vue'
import BaseInput from '@/components/Inputs/BaseInput.vue'
import Modal from '@/components/Modal.vue'
import CodeEditor from '@/components/CodeEditor.vue'
import api_request from '@/services/api'
import { useToast } from '@/composables/useToast'

const { showSuccess, showError } = useToast()

// Data
const payloads = ref<any[]>([])
const showModal = ref(false)
const editingPayload = ref<any>(null)
const currentPayload = ref({
  name: '',
  description: '',
  code: '',
  is_active: false
})

// Computed
const isValidPayload = computed(() => {
  return currentPayload.value.name && currentPayload.value.code
})

// Methods
const loadPayloads = async () => {
  try {
    const response = await api_request.get_payloads()
    if (response.success) {
      payloads.value = response.payloads || []
    }
  } catch (error) {
    console.error('Failed to load payloads:', error)
    showError('Failed to load payloads')
  }
}

const showNewPayloadModal = () => {
  editingPayload.value = null
  currentPayload.value = {
    name: '',
    description: '',
    code: `// Example payload
console.log("XSS Fired at:", window.location.href);
console.log("Cookies:", document.cookie);

// Send additional data back to XSS Hunter
if (typeof fetch !== "undefined") {
  // Your custom data collection here
}`,
    is_active: false
  }
  showModal.value = true
}

const editPayload = (payload: any) => {
  editingPayload.value = payload
  currentPayload.value = {
    name: payload.name,
    description: payload.description,
    code: payload.code,
    is_active: payload.is_active
  }
  showModal.value = true
}

const savePayload = async () => {
  try {
    let response
    if (editingPayload.value) {
      response = await api_request.update_payload(editingPayload.value.id, currentPayload.value)
    } else {
      response = await api_request.create_payload(currentPayload.value)
    }
    
    if (response.success) {
      showSuccess(
        editingPayload.value ? 'Payload updated successfully' : 'Payload created successfully'
      )
      await loadPayloads()
      closeModal()
    }
  } catch (error) {
    console.error('Failed to save payload:', error)
    showError('Failed to save payload')
  }
}

const testCurrentPayload = async () => {
  await testPayloadCode(currentPayload.value.code)
}

const testPayloadCode = async (code: string) => {
  // Show warning
  if (!confirm('Warning: This will open a popup window to test the payload. Continue?')) {
    return
  }
  
  try {
    // First, get a test token from the authenticated API
    const tokenData = await api_request.api_request(
      'POST',
      '/api/v1/generate-test-token',
      {}
    )

    if (!tokenData.success) {
      showError('Failed to generate test token. Please try again.')
      return
    }

    const testToken = tokenData.token

    // Create a form to POST the code to our test endpoint
    const form = document.createElement('form')
    form.method = 'POST'
    form.action = '/test-payload'
    form.target = 'PayloadTest'
    
    const codeInput = document.createElement('input')
    codeInput.type = 'hidden'
    codeInput.name = 'code'
    codeInput.value = code
    form.appendChild(codeInput)

    const tokenInput = document.createElement('input')
    tokenInput.type = 'hidden'
    tokenInput.name = 'test_token'
    tokenInput.value = testToken
    form.appendChild(tokenInput)
    
    // Open popup window
    const testWindow = window.open('', 'PayloadTest', 'width=800,height=600,toolbar=no,menubar=no,location=no')
    
    if (!testWindow) {
      showError('Popup blocked! Please allow popups for this site to test payloads.')
      return
    }
    
    // Submit form to the popup
    document.body.appendChild(form)
    form.submit()
    document.body.removeChild(form)
    
    showSuccess('Payload test window opened. Check the popup for results.')
    
  } catch (error) {
    console.error('Failed to create test environment:', error)
    showError('Failed to create test environment')
  }
}

const togglePayloadStatus = async (payload: any) => {
  try {
    const response = await api_request.update_payload(payload.id, {
      is_active: !payload.is_active
    })
    
    if (response.success) {
      showSuccess(
        payload.is_active ? 'Payload deactivated' : 'Payload activated'
      )
      await loadPayloads()
    }
  } catch (error) {
    console.error('Failed to toggle payload status:', error)
    showError('Failed to update payload status')
  }
}

const deletePayload = async (payload: any) => {
  if (!confirm(`Are you sure you want to delete "${payload.name}"?`)) {
    return
  }
  
  try {
    const response = await api_request.delete_payload(payload.id)
    if (response.success) {
      showSuccess('Payload deleted successfully')
      await loadPayloads()
    }
  } catch (error) {
    console.error('Failed to delete payload:', error)
    showError('Failed to delete payload')
  }
}

const closeModal = () => {
  showModal.value = false
  editingPayload.value = null
  currentPayload.value = {
    name: '',
    description: '',
    code: '',
    is_active: false
  }
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Mounted
onMounted(async () => {
  await loadPayloads()
})
</script>

<style scoped lang="scss">
/* Custom modal sizes - make xl even larger */
:deep(.modal-xl) {
  max-width: 95%;
  width: 95%;
}

@media (min-width: 1200px) {
  :deep(.modal-xl) {
    max-width: 1140px;
  }
}

/* Make the code editor dynamically sized */
:deep(.modal-black .code-editor) {
  min-height: 400px;
  max-height: 60vh;
  resize: vertical;
  overflow-y: auto;
}

.payload-code-editor {
  :deep(.cm-editor) {
    min-height: 400px;
    max-height: 60vh;
  }
}

.form-control {
  background-color: #27293d;
  border: 1px solid #2b3553;
  color: rgba(255, 255, 255, 0.8);
  
  &:focus {
    background-color: #27293d;
    border-color: #e14eca;
    color: #ffffff;
    box-shadow: none;
  }
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }
}

.badge-success {
  background-color: #51cf66;
  color: #fff;
  padding: 0.25em 0.6em;
  border-radius: 0.25rem;
}

.badge-secondary {
  background-color: #868e96;
  color: #fff;
  padding: 0.25em 0.6em;
  border-radius: 0.25rem;
}

/* Table layout fixes for proper column sizing */
.table {
  table-layout: fixed;
  width: 100%;
}

/* Column width distribution */
.payload-name {
  width: 20%;
  word-wrap: break-word;
  white-space: normal;
}

.payload-description {
  width: 35%;
  word-wrap: break-word;
  white-space: normal;
  line-height: 1.4;
}

.payload-status {
  width: 10%;
  text-align: center;
}

.payload-date {
  width: 15%;
  white-space: nowrap;
}

.payload-actions {
  width: 20%;
  white-space: nowrap;
}

/* Ensure buttons stay in a row */
.payload-actions button {
  display: inline-block;
  margin-right: 5px;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .payload-description {
    width: 30%;
  }
  
  .payload-actions {
    width: 25%;
  }
}

.form-check {
  display: block;
  padding-left: 0;
  min-height: 1.5rem;
}

.form-check-label {
  position: relative;
  display: inline-flex;
  align-items: center;
  margin-bottom: 0;
  cursor: pointer;
  padding-left: 28px;
}

.form-check-input {
  position: absolute;
  left: 0;
  opacity: 0;
  cursor: pointer;
  height: 18px;
  width: 18px;
  
  &:checked + .form-check-sign::before {
    background-color: #e14eca;
    border-color: #e14eca;
  }
  
  &:checked + .form-check-sign::after {
    display: block;
  }
}

.form-check-sign {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  height: 18px;
  width: 18px;
  
  &::before {
    position: absolute;
    top: 0;
    left: 0;
    display: block;
    width: 18px;
    height: 18px;
    content: "";
    background-color: transparent;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 3px;
    transition: all 0.15s ease-in-out;
  }
  
  &::after {
    position: absolute;
    display: none;
    top: 3px;
    left: 6px;
    width: 6px;
    height: 10px;
    border: solid #fff;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
    content: "";
  }
}
</style>