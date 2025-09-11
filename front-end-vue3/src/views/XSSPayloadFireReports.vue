<template>
  <div>
    <div class="row">
      <div class="col-12">
        <Card class="xss-card-container">
          <div class="row pl-4 pr-4 p-2" style="display: block;">
            <div>
              <h1>
                <i class="fas fa-fire"></i> XSS Payload Fire Reports
                ({{ formatWithCommas(reportCount) }} Total)
              </h1>
              <hr />
              <div v-for="report in payloadFireReports" :key="report.id">
                <Card class="mb-0">
                  <p class="text-right text-muted mb-1" style="font-size: 0.9em;">
                    <i>UUID: {{ report.id }}</i>
                  </p>
                  <div class="screenshot-image-container mb-2">
                    <a
                      :href="`${baseApiPath}/screenshots/${report.screenshot_id}.png`"
                      target="_blank"
                    >
                      <img
                        class="card-img-top report-image"
                        :src="`${baseApiPath}/screenshots/${report.screenshot_id}.png`"
                        alt="XSS Screenshot"
                      />
                    </a>
                  </div>
                  <h4 class="card-title">
                    <code>{{ report.url }}</code>
                  </h4>
                  <p class="card-text text-right">
                    <i>Fired {{ formatTimeAgo(report.createdAt) }}</i>
                  </p>
                  <div class="mt-3 button-full">
                    <BaseButton
                      class="m-0 btn-fill"
                      simple
                      type="primary"
                      @click="expandReport(report.id)"
                      v-if="!isReportExpanded(report.id)"
                    >
                      <i class="fas fa-angle-double-down"></i> Expand Report
                    </BaseButton>
                    <BaseButton
                      class="m-0 btn-fill"
                      simple
                      type="primary"
                      @click="collapseReport(report.id)"
                      v-if="isReportExpanded(report.id)"
                    >
                      <i class="fas fa-angle-double-up"></i> Collapse Report
                    </BaseButton>
                    <BaseButton
                      class="ml-2 w-25 delete-button"
                      simple
                      type="danger"
                      @click="deletePayloadFire(report.id)"
                    >
                      <i class="fas fa-trash-alt"></i>
                    </BaseButton>
                  </div>
                </Card>
                
                <!-- Expanded report -->
                <Card v-if="isReportExpanded(report.id)">
                  <div>
                    <div>
                      <p class="report-section-label mr-2">URL</p>
                      <small class="form-text text-muted report-section-description">
                        The URL of the page the payload fired on.
                      </small>
                    </div>
                    <div class="m-2 mt-4">
                      <code v-if="report.url">{{ report.url }}</code>
                      <pre v-else><i>None</i></pre>
                    </div>
                    <hr />
                  </div>
                  
                  <div>
                    <div>
                      <p class="report-section-label mr-2">IP Address</p>
                      <small class="form-text text-muted report-section-description">
                        Remote IP address of the victim.
                      </small>
                    </div>
                    <div class="m-2 mt-4">
                      <code v-if="report.ip_address">{{ report.ip_address }}</code>
                      <pre v-else><i>None</i></pre>
                    </div>
                    <hr />
                  </div>
                  
                  <div>
                    <div>
                      <p class="report-section-label mr-2">Referer</p>
                      <small class="form-text text-muted report-section-description">
                        Referring page for the vulnerable page.
                      </small>
                    </div>
                    <div class="m-2 mt-4">
                      <code v-if="report.referer">{{ report.referer }}</code>
                      <pre v-else><i>None</i></pre>
                    </div>
                    <hr />
                  </div>
                  
                  <div>
                    <div>
                      <p class="report-section-label mr-2">User-Agent</p>
                      <small class="form-text text-muted report-section-description">
                        Web browser of the victim.
                      </small>
                    </div>
                    <div class="m-2 mt-4">
                      <code v-if="report.user_agent">{{ report.user_agent }}</code>
                      <pre v-else><i>None</i></pre>
                    </div>
                    <hr />
                  </div>
                  
                  <div>
                    <div>
                      <p class="report-section-label mr-2">Cookies</p>
                      <small class="form-text text-muted report-section-description">
                        Non-HTTPOnly cookies of the victim.
                      </small>
                    </div>
                    <div class="m-2 mt-4">
                      <code v-if="report.cookies">{{ report.cookies }}</code>
                      <pre v-else><i>None</i></pre>
                    </div>
                    <hr />
                  </div>
                  
                  <!-- Local Storage and Session Storage -->
                  <div>
                    <div>
                      <p class="report-section-label mr-2">Local Storage</p>
                      <small class="form-text text-muted report-section-description">
                        Captured local storage data from the victim's browser.
                      </small>
                    </div>
                    <div class="m-2 mt-4">
                      <ul v-if="report.local_storage && report.local_storage.length">
                        <li v-for="(item, index) in report.local_storage" :key="index">
                          <span class="storage-key">{{ item.key }}:</span> 
                          <code>{{ item.value }}</code>
                        </li>
                      </ul>
                      <pre v-else><i>None</i></pre>
                    </div>
                    <hr />
                  </div>
                  
                  <div>
                    <div>
                      <p class="report-section-label mr-2">Session Storage</p>
                      <small class="form-text text-muted report-section-description">
                        Captured session storage data from the victim's browser.
                      </small>
                    </div>
                    <div class="m-2 mt-4">
                      <ul v-if="report.session_storage && report.session_storage.length">
                        <li v-for="(item, index) in report.session_storage" :key="index">
                          <span class="storage-key">{{ item.key }}:</span>
                          <code>{{ item.value }}</code>
                        </li>
                      </ul>
                      <pre v-else><i>None</i></pre>
                    </div>
                    <hr />
                  </div>
                  
                  <!-- Custom Scripts Data -->
                  <div v-if="report.custom_data && report.custom_data !== '[]'">
                    <div>
                      <p class="report-section-label mr-2">Custom Scripts Data</p>
                      <small class="form-text text-muted report-section-description">
                        Data collected by custom payload scripts using addCustomData().
                      </small>
                    </div>
                    <div class="m-2 mt-4">
                      <div v-for="(dataItem, index) in parseCustomData(report.custom_data)" :key="index" class="mb-3">
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
                    <hr />
                  </div>
                  
                  <div>
                    <div>
                      <p class="report-section-label mr-2">Title</p>
                      <small class="form-text text-muted report-section-description">
                        Vulnerable page's title.
                      </small>
                    </div>
                    <div class="m-2 mt-4">
                      <code v-if="report.title">{{ report.title }}</code>
                      <pre v-else><i>None</i></pre>
                    </div>
                    <hr />
                  </div>
                  
                  <div>
                    <div>
                      <p class="report-section-label mr-2">DOM/HTML</p>
                      <small class="form-text text-muted report-section-description">
                        Rendered DOM of the vulnerable page.
                      </small>
                    </div>
                    <div class="m-2 mt-4">
                      <CodeEditor
                        v-if="report.dom && report.dom.length < 10000"
                        :model-value="report.dom"
                        :readonly="true"
                        class="xss-report-codemirror"
                      />
                      <h4 v-else>
                        <i class="fas fa-exclamation-triangle"></i>
                        Page HTML too large to display inline, please use one of the options below.
                      </h4>
                      <BaseButton
                        simple
                        type="primary"
                        class="mt-3 ml-1 mr-1"
                        @click="viewHtmlInNewTab(report.dom)"
                      >
                        <i class="fas fa-external-link-alt"></i> View Raw HTML in New Tab
                      </BaseButton>
                      <BaseButton
                        simple
                        type="primary"
                        class="mt-3 ml-1 mr-1"
                        @click="downloadHtml(report.dom)"
                      >
                        <i class="fas fa-download"></i> Download Raw HTML
                      </BaseButton>
                    </div>
                    <hr />
                  </div>
                  
                  <div>
                    <div>
                      <p class="report-section-label mr-2">Text</p>
                      <small class="form-text text-muted report-section-description">
                        Text of the vulnerable page.
                      </small>
                    </div>
                    <div class="m-2 mt-4">
                      <CodeEditor
                        v-if="report.text"
                        :model-value="report.text"
                        :readonly="true"
                        class="xss-report-codemirror"
                      />
                      <pre v-else><i>None</i></pre>
                    </div>
                    <hr />
                  </div>
                  
                  <div>
                    <div>
                      <p class="report-section-label mr-2">Origin</p>
                      <small class="form-text text-muted report-section-description">
                        HTTP origin of the vulnerable page.
                      </small>
                    </div>
                    <div class="m-2 mt-4">
                      <code v-if="report.origin">{{ report.origin }}</code>
                      <pre v-else><i>None</i></pre>
                    </div>
                    <hr />
                  </div>
                  
                  <div>
                    <div>
                      <p class="report-section-label mr-2">Browser Time</p>
                      <small class="form-text text-muted report-section-description">
                        Reported time according to the victim's browser.
                      </small>
                    </div>
                    <div class="m-2 mt-4">
                      <code v-if="report.browser_timestamp">
                        {{ formatDate(parseInt(report.browser_timestamp)) }}
                        (<i>{{ report.browser_timestamp }}</i>)
                      </code>
                      <pre v-else><i>None</i></pre>
                    </div>
                    <hr />
                  </div>
                  
                  <div>
                    <div>
                      <p class="report-section-label mr-2">Other</p>
                      <small class="form-text text-muted report-section-description">
                        Other miscellaneous information.
                      </small>
                    </div>
                    <div class="m-2 mt-4">
                      <p>Fired in iFrame?: <code>{{ report.was_iframe }}</code></p>
                      <p>
                        Vulnerability enumerated 
                        <code>{{ formatDate(report.createdAt) }}</code>
                      </p>
                      <p>Report ID: <code>{{ report.id }}</code></p>
                    </div>
                    <hr />
                  </div>
                  
                  <BaseButton
                    simple
                    block
                    type="primary"
                    class="mt-4"
                    @click="collapseReport(report.id)"
                  >
                    <i class="fas fa-angle-double-up"></i> Collapse Report
                  </BaseButton>
                </Card>
                <hr />
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
import * as api from '@/services/api'
import { setLoadingHandler } from '@/services/api'

dayjs.extend(relativeTime)

// Data
const loading = ref(false)
const baseApiPath = ref('')
const page = ref(1)
const limit = 5
const expandedReportIds = ref<string[]>([])
const payloadFireReports = ref<any[]>([])
const reportCount = ref(0)

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

const expandReport = (reportId: string) => {
  expandedReportIds.value.push(reportId)
}

const collapseReport = (reportId: string) => {
  expandedReportIds.value = expandedReportIds.value.filter(id => id !== reportId)
}

const isReportExpanded = (reportId: string) => {
  return expandedReportIds.value.includes(reportId)
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
</style>