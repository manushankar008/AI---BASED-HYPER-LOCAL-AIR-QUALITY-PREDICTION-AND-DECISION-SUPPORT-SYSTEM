'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { AlertCircle, Wind, Heart, Leaf, Users, Activity, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

interface AQIData {
  current_aqi: number
  predicted_aqi: number
  risk: string
  color: string
  dominant_pollutant: string
  advisory: string
  pollutants: {
    pm25: number
    pm10: number
    no2: number
    co: number
    so2: number
    o3: number
  }
  trend: Array<{
    date: string
    aqi: number
  }>
}

// Mock data - replace with API call
const mockAQIData: AQIData = {
  current_aqi: 142,
  predicted_aqi: 168,
  risk: 'Unhealthy',
  color: 'orange',
  dominant_pollutant: 'PM2.5',
  advisory: 'Avoid prolonged outdoor activities. Sensitive groups should remain indoors.',
  pollutants: {
    pm25: 85,
    pm10: 120,
    no2: 45,
    co: 32,
    so2: 15,
    o3: 28,
  },
  trend: [
    { date: 'Yesterday', aqi: 98 },
    { date: 'Today', aqi: 142 },
    { date: 'Tomorrow', aqi: 168 },
  ],
}

// Counter animation component
const AnimatedCounter = ({ value, duration = 1.5 }: { value: number; duration?: number }) => {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    let start = 0
    const increment = value / (duration * 60)
    const timer = setInterval(() => {
      start += increment
      if (start >= value) {
        setDisplayValue(value)
        clearInterval(timer)
      } else {
        setDisplayValue(Math.floor(start))
      }
    }, 16)

    return () => clearInterval(timer)
  }, [value, duration])

  return <span>{displayValue}</span>
}

// Risk level color mapping
const getRiskColor = (risk: string) => {
  const riskMap: { [key: string]: string } = {
    'Good': 'bg-emerald-500/20 text-emerald-700 border-emerald-200',
    'Moderate': 'bg-amber-500/20 text-amber-700 border-amber-200',
    'Unhealthy for Sensitive Groups': 'bg-yellow-500/20 text-yellow-700 border-yellow-200',
    'Unhealthy': 'bg-orange-500/20 text-orange-700 border-orange-200',
    'Very Unhealthy': 'bg-red-500/20 text-red-700 border-red-200',
    'Hazardous': 'bg-red-900/20 text-red-900 border-red-900',
  }
  return riskMap[risk] || 'bg-gray-500/20 text-gray-700 border-gray-200'
}

// Advisory item component
const AdvisoryItem = ({ icon: Icon, label, status, color }: { icon: any; label: string; status: string; color: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className={`p-4 rounded-lg border ${color}`}
  >
    <div className="flex items-center gap-3">
      <Icon className="w-5 h-5" />
      <div className="flex-1">
        <p className="font-semibold text-sm">{label}</p>
        <p className="text-xs opacity-75">{status}</p>
      </div>
    </div>
  </motion.div>
)

export default function AQIDashboard() {
  const [data, setData] = useState<AQIData>(mockAQIData)
  const [city, setCity] = useState('Campus')
  const [isLoading, setIsLoading] = useState(false)

  

  const handleSearch = async () => {
   if (!city) return

  setIsLoading(true)

  try {
    const response = await fetch("http://localhost:5000/api/aqi", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ city }),
    })

    if (!response.ok) {
      throw new Error("Server error")
    }

    const result = await response.json()
    setData(result)
  } catch (error) {
    console.error("Error fetching AQI:", error)
  }

  setIsLoading(false)
}

  // Pollutant data for bar chart
  const pollutantData = [
    { name: 'PM2.5', value: data.pollutants.pm25 },
    { name: 'PM10', value: data.pollutants.pm10 },
    { name: 'NO₂', value: data.pollutants.no2 },
    { name: 'CO', value: data.pollutants.co },
    { name: 'SO₂', value: data.pollutants.so2 },
    { name: 'O₃', value: data.pollutants.o3 },
  ]

  const riskColorClass = getRiskColor(data.risk)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-6 md:p-8">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-2">
          Intelligent Air Quality Risk & Health Advisory System
        </h1>
        <p className="text-lg text-slate-600">Campus Environmental Intelligence Dashboard</p>
      </motion.div>

      {/* Search Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="mb-8 flex gap-2"
      >
        <Input
          type="text"
          placeholder="Enter city or location..."
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={handleSearch} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
          <Search className="w-4 h-4 mr-2" />
          {isLoading ? 'Searching...' : 'Search'}
        </Button>
      </motion.div>

      {/* Top KPI Cards */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
      >
        {/* Current AQI */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="bg-white rounded-2xl p-6 shadow-md border border-blue-100"
        >
          <p className="text-slate-600 text-sm font-medium mb-2">Current AQI</p>
          <div className="text-5xl font-bold text-blue-600 mb-2">
            <AnimatedCounter value={data.current_aqi} />
          </div>
          <p className="text-xs text-slate-500">Real-time measurement</p>
        </motion.div>

        {/* Predicted AQI */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="bg-white rounded-2xl p-6 shadow-md border border-green-100"
        >
          <p className="text-slate-600 text-sm font-medium mb-2">Predicted AQI</p>
          <div className="text-5xl font-bold text-green-600 mb-2">
            <AnimatedCounter value={data.predicted_aqi} />
          </div>
          <p className="text-xs text-slate-500">Next 24 hours (Hybrid)</p>
        </motion.div>

        {/* Risk Level */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="bg-white rounded-2xl p-6 shadow-md border border-orange-100"
        >
          <p className="text-slate-600 text-sm font-medium mb-2">Risk Level</p>
          <Badge className={`${riskColorClass} text-base py-1 px-3 mb-2 border`}>{data.risk}</Badge>
          <p className="text-xs text-slate-500">Air quality status</p>
        </motion.div>

        {/* Dominant Pollutant */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="bg-white rounded-2xl p-6 shadow-md border border-amber-100"
        >
          <p className="text-slate-600 text-sm font-medium mb-2">Dominant Pollutant</p>
          <p className="text-3xl font-bold text-amber-600 mb-2">{data.dominant_pollutant}</p>
          <p className="text-xs text-slate-500">Primary air contaminant</p>
        </motion.div>
      </motion.div>

      {/* Charts Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"
      >
        {/* AQI Trend Chart */}
        <Card className="p-6 border-blue-100 shadow-md">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">AQI Trend (Last 3 Days)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="aqi"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: '#3b82f6', r: 6 }}
                activeDot={{ r: 8 }}
                isAnimationActive={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Pollutant Breakdown Chart */}
        <Card className="p-6 border-green-100 shadow-md">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Pollutant Breakdown</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={pollutantData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="value" fill="#10b981" isAnimationActive={true} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </motion.div>

      {/* Health & Activity Advisory Panel */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="mb-8"
      >
        <h2 className="text-2xl font-semibold text-slate-900 mb-4">Health & Activity Advisory</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdvisoryItem
            icon={Activity}
            label="Outdoor Sports Status"
            status="Unsafe - Indoor activities recommended"
            color="bg-red-50 border-red-200 text-red-700"
          />
          <AdvisoryItem
            icon={Wind}
            label="Mask Recommendation"
            status="N95 or P100 masks strongly advised"
            color="bg-orange-50 border-orange-200 text-orange-700"
          />
          <AdvisoryItem
            icon={Heart}
            label="Sensitive Individuals"
            status="Remain indoors with filtered air"
            color="bg-amber-50 border-amber-200 text-amber-700"
          />
          <AdvisoryItem
            icon={Users}
            label="Campus Recommendation"
            status="Limit outdoor exposure to 30 min max"
            color="bg-yellow-50 border-yellow-200 text-yellow-700"
          />
        </div>
      </motion.div>

      {/* Explainable Insights Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="bg-white rounded-2xl p-6 shadow-md border border-slate-200"
      >
        <h2 className="text-2xl font-semibold text-slate-900 mb-4">Explainable Insights</h2>
        <div className="mb-4">
          <p className="text-slate-700 text-lg leading-relaxed">
            AQI is primarily driven by elevated <span className="font-bold text-amber-600">{data.dominant_pollutant}</span> levels.
          </p>
          <p className="text-slate-600 text-sm mt-2">{data.advisory}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {pollutantData.map((pollutant, index) => (
            <motion.div
              key={index}
              whileHover={{ scale: 1.05 }}
              className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium border border-blue-200"
            >
              {pollutant.name}: {pollutant.value} μg/m³
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
