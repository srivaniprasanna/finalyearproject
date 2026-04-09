// Backend base URL
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function request(path, options = {}) {

  const url = `${BASE}${path}`

  console.log("API Request:", url)

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(data.detail || 'Request failed')
  }

  return data
}


// -----------------------------------
// AUTH
// -----------------------------------

export async function sendOtp({ email, name, mobile }) {

  const body = { email: email.trim().toLowerCase() }

  if (name) body.name = name.trim()
  if (mobile) body.mobile = mobile.trim()

  return request('/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify(body)
  })
}


export async function registerWithOtp({ email, otp, name, mobile }) {

  const body = {
    email: email.trim().toLowerCase(),
    otp: otp.trim()
  }

  if (name) body.name = name.trim()
  if (mobile) body.mobile = mobile.trim()

  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(body)
  })
}


export async function signup({ email, mobile, password, name }) {
  const normalizedEmail = (email || '').trim().toLowerCase()
  return request('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      email: normalizedEmail || undefined,
      mobile: mobile.trim(),
      password,
      name: (name || '').trim() || undefined
    })
  })
}


export async function loginWithPassword({ mobile, password }) {
  return request('/auth/login/password', {
    method: 'POST',
    body: JSON.stringify({
      mobile: mobile.trim(),
      password
    })
  })
}


// -----------------------------------
// CROP SUITABILITY CHECK
// -----------------------------------

export async function cropCheck({ cropName, lat, lon, state, district }) {

  const params = new URLSearchParams({
    crop_name: cropName
  })

  if (lat !== null && lat !== undefined) params.set('lat', lat)
  if (lon !== null && lon !== undefined) params.set('lon', lon)

  if (state) params.set('state', state)
  if (district) params.set('district', district)

  return request(`/crop/check?${params}`)
}


// -----------------------------------
// BEST CROPS FOR LOCATION
// -----------------------------------

export async function bestCrops({ lat, lon, state, district, includeExplanations = false }) {

  if (lat === null || lon === null) {
    throw new Error("Location not available")
  }

  const params = new URLSearchParams()

  params.set('lat', lat)
  params.set('lon', lon)

  if (state) params.set('state', state)
  if (district) params.set('district', district)
  if (includeExplanations) params.set('include_explanations', 'true')

  return request(`/crop/best?${params}`)
}


// -----------------------------------
// REVERSE GEOCODE
// -----------------------------------

export async function reverseGeocode({ lat, lon }) {

  const params = new URLSearchParams({
    lat,
    lon
  })

  return request(`/geo/reverse?${params}`)
}


// -----------------------------------
// FERTILIZER RECOMMENDATION
// -----------------------------------

export async function fertilizerRecommend({
  cropName,
  soilType = 'alluvial',
  soilPh,
  acreage = 1
}) {

  const params = new URLSearchParams({
    crop_name: cropName,
    soil_type: soilType,
    acreage
  })

  if (soilPh !== null && soilPh !== undefined) {
    params.set('soil_ph', soilPh)
  }

  return request(`/fertilizer/recommend?${params}`)
}


// -----------------------------------
// IRRIGATION RECOMMENDATION
// -----------------------------------

export async function irrigationRecommend({
  cropName,
  rainfallMm = 800,
  soilType = 'alluvial',
  growthStage
}) {

  const params = new URLSearchParams({
    crop_name: cropName,
    rainfall_mm: rainfallMm,
    soil_type: soilType
  })

  if (growthStage) params.set('growth_stage', growthStage)

  return request(`/irrigation/recommend?${params}`)
}


// -----------------------------------
// GOVERNMENT SCHEMES
// -----------------------------------

export async function schemes(lang = 'en') {

  const data = await request(`/schemes?lang=${lang}`)

  return data.schemes || []
}


// -----------------------------------
// PRICE PREDICTION
// -----------------------------------

export async function pricePredict({ cropName, district }) {

  const params = new URLSearchParams({
    crop_name: cropName
  })

  if (district) params.set('district', district)

  return request(`/price/predict?${params}`)
}


// -----------------------------------
// YIELD PREDICTION
// -----------------------------------

export async function yieldPredict({
  cropName,
  district,
  state,
  rainfallMm = 800
}) {

  const params = new URLSearchParams({
    crop_name: cropName,
    rainfall_mm: rainfallMm
  })

  if (district) params.set('district', district)
  if (state) params.set('state', state)

  return request(`/yield/predict?${params}`)
}