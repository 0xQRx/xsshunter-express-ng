<template>
  <div>
    <div class="row">
      <div class="col-12">
        <Card class="xss-card-container">
          <div class="card-content-wrapper">
            <div>
              <h1>
                <i class="fas fa-fire"></i> XSS Payload Fire Reports
                ({{ formatWithCommas(reportCount) }} Total)
              </h1>
              <hr />
              
              <!-- Card Grid Layout -->
              <div class="payload-cards-grid">
                <div v-for="report in payloadFireReports" :key="report.id" class="payload-card-wrapper">
                  <Card class="payload-card">
                    <!-- Screenshot Section -->
                    <div class="card-screenshot">
                      <div v-if="!imageErrors[report.screenshot_id]" class="screenshot-container">
                        <img
                          :src="`${baseApiPath}/screenshots/${report.screenshot_id}.png`"
                          alt="XSS Screenshot"
                          @error="handleImageError(report.screenshot_id)"
                          @load="handleImageLoad($event, report.screenshot_id)"
                          @click="openReportModal(report)"
                        />
                      </div>
                      <div v-else class="screenshot-placeholder-grid" @click="openReportModal(report)">
                        <i class="fas fa-image fa-2x"></i>
                        <small>No screenshot</small>
                      </div>
                      
                      <!-- Time Badge -->
                      <div class="time-badge">
                        {{ formatTimeAgo(report.createdAt) }}
                      </div>
                    </div>
                    
                    <!-- Card Content -->
                    <div class="card-content">
                      <div class="url-section">
                        <code class="url-text">{{ truncateUrl(report.url, 50) }}</code>
                      </div>
                      
                      <!-- Action Buttons -->
                      <div class="card-actions">
                        <BaseButton
                          class="view-btn"
                          simple
                          type="primary"
                          size="sm"
                          @click="openReportModal(report)"
                        >
                          <i class="fas fa-eye"></i> View
                        </BaseButton>
                        <BaseButton
                          class="delete-btn"
                          simple
                          type="danger"
                          size="sm"
                          @click="deletePayloadFire(report.id)"
                        >
                          <i class="fas fa-trash"></i>
                        </BaseButton>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
              
              <!-- Pagination -->
              <div class="text-center pagination-div">
                <BasePagination v-model="page" :page-count="totalPages" />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
    
    <!-- Loading bar -->
    <div class="loading-bar" v-if="loading">
      <div class="progress">
        <div
          role="progressbar"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow="100"
          class="progress-bar bg-primary-theme progress-bar-striped progress-bar-animated"
          style="width: 100%;"
        ></div>
      </div>
    </div>
    
    <!-- Report Details Modal -->
    <Modal
      v-model="showReportModal"
      :show-close="true"
      modal-classes="modal-xl modal-black"
      :centered="true"
      @close="closeReportModal"
    >
      <template #header>
        <h4 class="modal-title" v-if="selectedReport">
          <i class="fas fa-fire"></i> XSS Report Details
        </h4>
        <p class="mb-0" style="font-size: 14px;">
          <code style="color: #5dade2;">{{ selectedReport?.url }}</code>
        </p>
      </template>
      
      <div v-if="selectedReport" class="report-modal-content">
        <!-- Screenshot -->
        <div class="report-section">
          <p class="report-section-label">Screenshot</p>
          <small class="text-muted">Screenshot of the vulnerable page.</small>
          <div class="mt-2">
            <div v-if="!imageErrors[selectedReport.screenshot_id]" class="screenshot-image-container">
              <a
                :href="`${baseApiPath}/screenshots/${selectedReport.screenshot_id}.png`"
                target="_blank"
              >
                <img
                  class="report-image"
                  :src="`${baseApiPath}/screenshots/${selectedReport.screenshot_id}.png`"
                  alt="XSS Screenshot"
                  style="width: 100%; height: auto;"
                  @error="handleImageError(selectedReport.screenshot_id)"
                  @load="handleImageLoad($event, selectedReport.screenshot_id)"
                />
              </a>
            </div>
            <div v-else class="screenshot-placeholder">
              <i class="fas fa-image fa-3x mb-3"></i>
              <p class="mb-2">Screenshot capture failed</p>
              <small class="text-muted">Common with single-page applications that render content dynamically (React, Vue, Angular, etc.)</small>
            </div>
          </div>
        </div>
        <hr />
        
        <!-- URL -->
        <div class="report-section">
          <p class="report-section-label">URL</p>
          <small class="text-muted">The URL of the page the payload fired on.</small>
          <div class="mt-2">
            <code>{{ selectedReport.url || 'None' }}</code>
          </div>
        </div>
        <hr />
        
        <!-- IP Address -->
        <div class="report-section">
          <p class="report-section-label">IP Address</p>
          <small class="text-muted">Remote IP address of the victim.</small>
          <div class="mt-2">
            <code>{{ selectedReport.ip_address || 'None' }}</code>
          </div>
        </div>
        <hr />
        
        <!-- Referer -->
        <div class="report-section">
          <p class="report-section-label">Referer</p>
          <small class="text-muted">Referring page for the vulnerable page.</small>
          <div class="mt-2">
            <code>{{ selectedReport.referer || 'None' }}</code>
          </div>
        </div>
        <hr />
        
        <!-- User Agent -->
        <div class="report-section">
          <p class="report-section-label">User-Agent</p>
          <small class="text-muted">Web browser of the victim.</small>
          <div class="mt-2">
            <code>{{ selectedReport.user_agent || 'None' }}</code>
          </div>
        </div>
        <hr />
        
        <!-- Cookies -->
        <div class="report-section">
          <p class="report-section-label">Cookies</p>
          <small class="text-muted">Non-HTTPOnly cookies of the victim.</small>
          <div class="mt-2">
            <code>{{ selectedReport.cookies || 'None' }}</code>
          </div>
        </div>
        <hr />
        
        <!-- Local Storage -->
        <div class="report-section">
          <p class="report-section-label">Local Storage</p>
          <small class="text-muted">Captured local storage data from the victim's browser.</small>
          <div class="mt-2">
            <ul v-if="selectedReport.local_storage && selectedReport.local_storage.length">
              <li v-for="(item, index) in selectedReport.local_storage" :key="index">
                <span class="storage-key">{{ item.key }}:</span>
                <code>{{ item.value }}</code>
              </li>
            </ul>
            <pre v-else><i>None</i></pre>
          </div>
        </div>
        <hr />
        
        <!-- Session Storage -->
        <div class="report-section">
          <p class="report-section-label">Session Storage</p>
          <small class="text-muted">Captured session storage data from the victim's browser.</small>
          <div class="mt-2">
            <ul v-if="selectedReport.session_storage && selectedReport.session_storage.length">
              <li v-for="(item, index) in selectedReport.session_storage" :key="index">
                <span class="storage-key">{{ item.key }}:</span>
                <code>{{ item.value }}</code>
              </li>
            </ul>
            <pre v-else><i>None</i></pre>
          </div>
        </div>
        <hr />
        
        <!-- Custom Scripts Data -->
        <div v-if="selectedReport.custom_data && selectedReport.custom_data !== '[]'" class="report-section">
          <p class="report-section-label">Custom Scripts Data</p>
          <small class="text-muted">Data collected by custom payload scripts using addCustomData().</small>
          <div class="mt-3">
            <div v-for="(dataItem, index) in parseCustomData(selectedReport.custom_data)" :key="index" class="mb-3">
              <h5 class="text-primary">{{ dataItem.title }}</h5>
              <CodeEditor
                :model-value="formatCustomDataObject(dataItem.data)"
                :readonly="true"
                class="xss-report-codemirror"
              />
              <small class="text-muted">
                Collected at: {{ new Date(dataItem.timestamp).toLocaleString() }}
              </small>
            </div>
          </div>
        </div>
        <hr v-if="selectedReport.custom_data && selectedReport.custom_data !== '[]'" />
        
        <!-- Title -->
        <div class="report-section">
          <p class="report-section-label">Title</p>
          <small class="text-muted">Vulnerable page's title.</small>
          <div class="mt-2">
            <code>{{ selectedReport.title || 'None' }}</code>
          </div>
        </div>
        <hr />
        
        <!-- DOM HTML -->
        <div class="report-section">
          <p class="report-section-label">DOM HTML</p>
          <small class="text-muted">HTML of the vulnerable page.</small>
          <div class="mt-2">
            <CodeEditor
              v-if="selectedReport.dom && selectedReport.dom.length < 10000"
              :model-value="selectedReport.dom"
              :readonly="true"
              language="html"
              class="xss-report-codemirror"
            />
            <div v-else>
              <h4>
                <i class="fas fa-exclamation-triangle"></i>
                Page HTML too large to display inline, please use one of the options below.
              </h4>
              <div class="button-group-responsive">
                <BaseButton
                  simple
                  type="primary"
                  class="mt-3 ml-1 mr-1 hide-mobile-text"
                  @click="viewHtmlInNewTab(selectedReport.dom)"
                >
                  <i class="fas fa-external-link-alt"></i> <span>View Raw HTML in New Tab</span>
                </BaseButton>
                <BaseButton
                  simple
                  type="primary"
                  class="mt-3 ml-1 mr-1 hide-mobile-text"
                  @click="downloadHtml(selectedReport.dom)"
                >
                  <i class="fas fa-download"></i> <span>Download Raw HTML</span>
                </BaseButton>
              </div>
            </div>
          </div>
        </div>
        <hr />
        
        <!-- Text -->
        <div class="report-section">
          <p class="report-section-label">Text</p>
          <small class="text-muted">Text of the vulnerable page.</small>
          <div class="mt-2">
            <CodeEditor
              v-if="selectedReport.text"
              :model-value="selectedReport.text"
              :readonly="true"
              class="xss-report-codemirror"
            />
            <pre v-else><i>None</i></pre>
          </div>
        </div>
        <hr />
        
        <!-- Origin -->
        <div class="report-section">
          <p class="report-section-label">Origin</p>
          <small class="text-muted">Origin of the page.</small>
          <div class="mt-2">
            <code>{{ selectedReport.origin || 'None' }}</code>
          </div>
        </div>
        <hr />
        
        <!-- Browser Time -->
        <div class="report-section">
          <p class="report-section-label">Browser Timestamp</p>
          <small class="text-muted">Reported time according to the victim's browser.</small>
          <div class="mt-2">
            <code v-if="selectedReport.browser_timestamp">
              {{ formatDate(parseInt(selectedReport.browser_timestamp)) }}
              (<i>{{ selectedReport.browser_timestamp }}</i>)
            </code>
            <pre v-else><i>None</i></pre>
          </div>
        </div>
        <hr />
        
        <!-- Other Info -->
        <div class="report-section">
          <p class="report-section-label">Other</p>
          <small class="text-muted">Other miscellaneous information.</small>
          <div class="mt-2">
            <p><span class="info-label">Fired in iFrame?:</span> <code>{{ selectedReport.was_iframe }}</code></p>
            <p><span class="info-label">Vulnerability enumerated:</span> <code>{{ formatDate(selectedReport.createdAt) }}</code></p>
            <p><span class="info-label">Report ID:</span> <code>{{ selectedReport.id }}</code></p>
          </div>
        </div>
      </div>
      
      <template #footer>
        <BaseButton type="secondary" @click="closeReportModal">
          Close
        </BaseButton>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import Card from '@/components/Cards/Card.vue'
import BaseButton from '@/components/BaseButton.vue'
import BasePagination from '@/components/BasePagination.vue'
import CodeEditor from '@/components/CodeEditor.vue'
import Modal from '@/components/Modal.vue'
import * as api from '@/services/api'
import { setLoadingHandler } from '@/services/api'

dayjs.extend(relativeTime)

// Data
const loading = ref(false)
const baseApiPath = ref('')
const page = ref(1)
const limit = 6  // Changed to 6 for better grid layout
const showReportModal = ref(false)
const selectedReport = ref<any>(null)
const payloadFireReports = ref<any[]>([])
const reportCount = ref(0)
const imageErrors = ref<Record<string, boolean>>({})

// Set loading handler
setLoadingHandler((isLoading: boolean) => {
  loading.value = isLoading
})

// Computed
const totalPages = computed(() => {
  return Math.ceil(reportCount.value / limit)
})

// Methods
const formatWithCommas = (inputNumber: number) => {
  return inputNumber.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

const formatTimeAgo = (date: string) => {
  return dayjs(date).fromNow()
}

const formatDate = (date: string | number) => {
  return dayjs(date).format('dddd, MMMM D YYYY, h:mm:ss a')
}

const deletePayloadFire = async (payloadId: string) => {
  await api.delete_payload_fires([payloadId])
  await pullPayloadFireReports()
}

const pullPayloadFireReports = async () => {
  const reports = await api.get_payload_fires(page.value, limit)
  payloadFireReports.value = reports.result.payload_fires
  reportCount.value = reports.result.total
}

const openReportModal = (report: any) => {
  selectedReport.value = report
  showReportModal.value = true
}

const closeReportModal = () => {
  showReportModal.value = false
  selectedReport.value = null
}

const viewHtmlInNewTab = (inputHtml: string) => {
  const newWindow = window.open('about:blank', '_blank')
  if (newWindow) {
    newWindow.document.body.innerText = inputHtml
  }
}

const downloadHtml = (inputHtml: string) => {
  const link = document.createElement('a')
  link.href = `data:text/html,${inputHtml}`
  link.download = 'xss-page-contents.html'
  link.click()
}

const parseCustomData = (customDataString: string) => {
  try {
    if (!customDataString || customDataString === '[]') return []
    return JSON.parse(customDataString)
  } catch (e) {
    console.error('Error parsing custom data:', e)
    return []
  }
}

const formatCustomDataObject = (obj: any) => {
  try {
    return JSON.stringify(obj, null, 2)
  } catch (e) {
    return String(obj)
  }
}

const handleImageError = (screenshotId: string) => {
  imageErrors.value[screenshotId] = true
}

const handleImageLoad = (event: Event, screenshotId: string) => {
  const img = event.target as HTMLImageElement
  // Check if image actually loaded with content (not a 1x1 pixel or very small)
  if (img.naturalWidth <= 1 || img.naturalHeight <= 1) {
    imageErrors.value[screenshotId] = true
  } else {
    // Image loaded successfully
    delete imageErrors.value[screenshotId]
  }
}

const truncateUrl = (url: string, maxLength: number = 50) => {
  if (!url) return 'No URL'
  if (url.length <= maxLength) return url
  return url.substring(0, maxLength) + '...'
}

// Watch
watch(page, async (oldVal, newVal) => {
  await pullPayloadFireReports()
  
  if (oldVal !== newVal) {
    window.scroll({
      top: 0,
      left: 0,
      behavior: 'smooth'
    })
  }
})

// Mounted
onMounted(async () => {
  baseApiPath.value = api.BASE_API_PATH
  await pullPayloadFireReports()
})
</script>

<style scoped lang="scss">
@import '@/assets/sass/mobile-responsive';

// All styles from original component (using theme variables)
.button-full {
  display: flex;
}

.button-full.all > button {
  width: 100%;
  margin: 0 2px;
}

.btn-fill {
  width: 100%;
  margin: 0 5px;
}

.delete-button {
  max-width: 100px !important;
  width: 20%;
}

.expand-button {
  width: 80%;
}

.pagination-div {
  width: 100%;
  display: flex;
  justify-content: center;
}

.report-section-label {
  font-size: 18px;
  display: inline;
}

.report-section-input {
  width: 100%;
  
  input {
    width: 100% !important;
    border-color: #bb54f4 !important;
  }
}

.report-section-description {
  color: #d3d3d7 !important;
  font-style: italic;
  display: inline;
  float: right;
}

.xss-card-container {
  max-width: 1000px;
  width: 100%;
}

.screenshot-image-container {
  background-color: #FFFFFF;
}

.screenshot-placeholder {
  background: rgba(255, 255, 255, 0.05);
  padding: 2rem 1rem;
  text-align: center;
  border: 1px dashed rgba(255, 255, 255, 0.2);
  
  i {
    color: rgba(255, 255, 255, 0.3);
  }
  
  p {
    color: rgba(255, 255, 255, 0.6);
    margin: 0;
  }
}

.report-image {
  width: 100%;
  height: 50vh;
}

.storage-key {
  font-weight: 500;
  color: #5dade2;
}

hr {
  background-color: #344675;
}

.loading-bar {
  position: fixed;
  bottom: 0;
  width: 100%;
  height: 16px;
  right: 0;
  z-index: 10;
}

// Progress bar styles
.progress-bar-animated {
  animation: progress-bar-stripes 1s linear infinite;
}

.progress-bar-striped {
  background-image: linear-gradient(45deg, hsla(0, 0%, 100%, .15) 25%, transparent 0, transparent 50%, hsla(0, 0%, 100%, .15) 0, hsla(0, 0%, 100%, .15) 75%, transparent 0, transparent);
  background-size: 1rem 1rem;
}

.progress-bar {
  flex-direction: column;
  justify-content: center;
  color: #fff;
  text-align: center;
  white-space: nowrap;
  background-color: #007bff;
  transition: width .6s ease;
}

.progress,
.progress-bar {
  display: flex;
  overflow: hidden;
}

.progress {
  height: 1rem;
  line-height: 0;
  font-size: .75rem;
  background-color: #1b0036;
  border-radius: .25rem;
}

// Modal styles
.modal-black {
  .modal-content {
    background: linear-gradient(to bottom, #1e1e2e 0%, #27293d 100%);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .modal-header {
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding: 1.5rem;
    
    .modal-title {
      color: rgba(255, 255, 255, 0.95);
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
    }
    
    .close {
      color: rgba(255, 255, 255, 0.8);
      opacity: 1;
      font-size: 1.5rem;
      
      &:hover {
        color: #fff;
      }
    }
  }
  
  .modal-footer {
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding: 1rem 1.5rem;
  }
}

.report-modal-content {
  max-height: 70vh;
  overflow-y: auto;
  padding: 1.5rem;
  
  .report-section {
    margin-bottom: 1.5rem;
    
    .report-section-label {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: rgba(255, 255, 255, 0.9);
    }
    
    .text-muted {
      font-size: 14px;
      font-style: italic;
      display: block;
      margin-bottom: 0.75rem;
      color: rgba(255, 255, 255, 0.6) !important;
    }
    
    code {
      word-break: break-all;
      display: inline-block;
      margin-top: 0.5rem;
      color: #f4bf75;
    }
    
    pre {
      word-break: break-all;
      background: rgba(255, 255, 255, 0.05);
      padding: 1rem;
      border-radius: 0.25rem;
      margin-top: 0.5rem;
      max-height: 300px;
      overflow-y: auto;
      
      i {
        color: rgba(255, 255, 255, 0.4);
        font-style: italic;
      }
    }
    
    ul {
      list-style: none;
      padding: 0;
      margin-top: 0.5rem;
      
      li {
        padding: 0.5rem 0;
        margin-bottom: 0.25rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        
        &:last-child {
          border-bottom: none;
        }
        
        code {
          background: none;
          padding: 0;
        }
      }
    }
    
    .info-label {
      color: rgba(255, 255, 255, 0.7);
      font-weight: 500;
    }
  }
  
  .xss-report-codemirror {
    margin-top: 0.5rem;
    
    .cm-editor {
      max-height: 300px !important;
      border: 1px solid rgba(255, 255, 255, 0.2) !important;
    }
  }
  
  .storage-key {
    font-weight: 600;
    color: #5dade2;
    margin-right: 0.5rem;
  }
  
  .screenshot-image-container {
    background-color: #FFFFFF;
    padding: 1rem;
    border-radius: 0.5rem;
    margin-top: 0.5rem;
    
    img {
      border-radius: 0.25rem;
    }
  }
  
  .screenshot-placeholder {
    background: rgba(255, 255, 255, 0.05);
    padding: 2rem;
    border-radius: 0.5rem;
    text-align: center;
    border: 2px dashed rgba(255, 255, 255, 0.2);
    
    i {
      color: rgba(255, 255, 255, 0.3);
    }
    
    p {
      color: rgba(255, 255, 255, 0.6);
      margin-bottom: 0.5rem;
    }
  }
  
  hr {
    border-color: rgba(255, 255, 255, 0.1);
    margin: 1.5rem 0;
  }
}

// Card Grid Styles
.payload-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
  margin: 2rem 0;
  
  @media (max-width: $tablet) {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
  }
  
  @media (max-width: $mobile) {
    grid-template-columns: 1fr;
  }
}

.payload-card {
  background: $card-black-background;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 0.75rem;
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.5);
    border-color: rgba($primary, 0.4);
  }
  
  .card-screenshot {
    position: relative;
    height: 180px;
    background: linear-gradient(to bottom, #0d1117 0%, #161b22 100%);
    overflow: hidden;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    
    .screenshot-container {
      width: 100%;
      height: 100%;
      
      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.3s ease;
        cursor: pointer;
        
        &:hover {
          transform: scale(1.05);
        }
      }
    }
    
    .screenshot-placeholder-grid {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.05) 100%);
      color: rgba(255, 255, 255, 0.3);
      cursor: pointer;
      transition: all 0.3s ease;
      
      &:hover {
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.08) 100%);
        color: rgba(255, 255, 255, 0.5);
      }
      
      i {
        margin-bottom: 0.5rem;
      }
      
      small {
        font-size: 0.75rem;
      }
    }
    
    .time-badge {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      background: rgba($card-black-background, 0.95);
      backdrop-filter: blur(10px);
      color: $opacity-8;
      padding: 0.25rem 0.75rem;
      border-radius: 0.5rem;
      font-size: 0.75rem;
      font-weight: 500;
      border: 1px solid rgba($primary, 0.3);
    }
  }
  
  .card-content {
    padding: 1rem;
    flex: 1;
    display: flex;
    flex-direction: column;
    
    .url-section {
      flex: 1;
      margin-bottom: 1rem;
      
      .url-text {
        display: block;
        font-size: 0.85rem;
        color: $info;
        word-break: break-all;
        line-height: 1.4;
        background: transparent;
        padding: 0;
        border-radius: 0;
        border: none;
        opacity: 0.9;
      }
    }
    
    .card-actions {
      display: flex;
      gap: 0.5rem;
      
      .view-btn {
        flex: 1;
        padding: 0.5rem;
        font-size: 0.85rem;
        background: transparent;
        border: 1px solid rgba($primary, 0.5);
        color: $primary;
        
        &:hover {
          background: rgba($primary, 0.1);
          border-color: $primary;
        }
        
        i {
          margin-right: 0.25rem;
        }
      }
      
      .delete-btn {
        padding: 0.5rem 1rem;
        background: transparent;
        border: 1px solid rgba($danger, 0.5);
        color: $danger;
        
        &:hover {
          background: rgba($danger, 0.1);
          border-color: $danger;
        }
      }
    }
  }
}

// Mobile responsiveness - additional styles specific to this view
@media (max-width: $tablet) {
  .report-image {
    height: 30vh;
  }
  
  .report-section-label {
    font-size: 16px;
  }
  
  .report-section-description {
    display: block;
    float: none;
    margin-top: 0.25rem;
    font-size: 0.85rem;
  }
  
  .button-full {
    flex-direction: column;
    gap: 0.5rem;
    
    .btn-fill, .delete-button {
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
    }
  }
  
  code {
    word-break: break-all;
    font-size: 0.85rem;
  }
}
</style>