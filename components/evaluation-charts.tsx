"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Bar, BarChart, Pie, PieChart, Cell, XAxis, YAxis, Legend, ResponsiveContainer, CartesianGrid } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface EvaluationResult {
  departmentName: string
  evaluationStatus: string
  isComplete: boolean
  professorEmail: string
  professorId: string
  professorName: string
  responses: Array<{
    answer: string
    questionText: string
    questionType: string
    section?: string
  }>
  evaluationPeriodId?: string
  createdAt?: any
  submittedAt?: any
}

interface EvaluationChartsProps {
  evaluations: EvaluationResult[]
}

// Custom Bar component to ensure colors are applied
const CustomBar = (props: any) => {
  const { fill, payload, ...rest } = props
  const color = payload?.fill || fill || "#3b82f6"
  return (
    <rect
      {...rest}
      fill={color}
      stroke={color}
      strokeWidth={1}
      rx={6}
      ry={6}
    />
  )
}

export default function EvaluationCharts({ evaluations }: EvaluationChartsProps) {
  const allResponses = evaluations.flatMap((evaluation) => evaluation.responses)

  // Define available sections
  const SECTIONS = [
    "Instructional Competence",
    "Classroom Management",
    "Research",
    "Student Support & Development",
    "Professionalism & Personal Qualities",
    "verbal interpretation"
  ]

  // Get unique sections from data
  const availableSections = useMemo(() => {
    const sectionsFromData = new Set<string>()
    allResponses.forEach((response) => {
      if (response.section) {
        sectionsFromData.add(response.section)
      }
    })
    // Return sections that exist in data, maintaining order from SECTIONS
    const orderedSections = SECTIONS.filter(s => sectionsFromData.has(s))
    // Add any sections from data that aren't in SECTIONS
    sectionsFromData.forEach(s => {
      if (!SECTIONS.includes(s)) {
        orderedSections.push(s)
      }
    })
    return orderedSections.length > 0 ? orderedSections : SECTIONS
  }, [allResponses])

  const [selectedSection, setSelectedSection] = useState<string | null>(null)

  // Set default section when available sections are determined
  useMemo(() => {
    if (selectedSection === null && availableSections.length > 0) {
      setSelectedSection(availableSections[0])
    }
  }, [availableSections, selectedSection])

  // Filter responses by selected section
  const filteredResponses = useMemo(() => {
    if (!selectedSection) return allResponses
    return allResponses.filter((response) => response.section === selectedSection)
  }, [allResponses, selectedSection])

  // Calculate section-specific performance
  const sectionPerformance = useMemo(() => {
    const total = filteredResponses.length
    const positive = filteredResponses.filter(
      (r) => r.answer === "Strongly Agree" || r.answer === "Agree"
    ).length
    const percentage = total > 0 ? Math.round((positive / total) * 100) : 0

    let rating = "Needs Improvement"
    let ratingColor = "#ef4444" // Red
    if (percentage >= 90) {
      rating = "Excellent"
      ratingColor = "#10b981" // Green
    } else if (percentage >= 80) {
      rating = "Very Good"
      ratingColor = "#3b82f6" // Blue
    } else if (percentage >= 70) {
      rating = "Good"
      ratingColor = "#8b5cf6" // Purple
    } else if (percentage >= 60) {
      rating = "Satisfactory"
      ratingColor = "#f59e0b" // Amber
    }

    return { total, positive, percentage, rating, ratingColor }
  }, [filteredResponses])

  const answerCounts: Record<string, number> = {}
  filteredResponses.forEach((response) => {
    const answer = response.answer
    answerCounts[answer] = (answerCounts[answer] || 0) + 1
  })

  const pieChartData = Object.entries(answerCounts).map(([name, value]) => ({
    name,
    value,
  }))

  // Enhanced color palette for better visual distinction
  const COLORS = {
    "Strongly Agree": "#10b981", // Green
    Agree: "#3b82f6", // Blue
    Undecided: "#f59e0b", // Amber
    Disagree: "#f97316", // Orange
    "Strongly Disagree": "#ef4444", // Red
  }

  // Additional vibrant colors for variety
  const GRADIENT_COLORS = [
    { start: "#10b981", end: "#059669" }, // Green gradient
    { start: "#3b82f6", end: "#2563eb" }, // Blue gradient
    { start: "#8b5cf6", end: "#7c3aed" }, // Purple gradient
    { start: "#ec4899", end: "#db2777" }, // Pink gradient
    { start: "#f59e0b", end: "#d97706" }, // Amber gradient
    { start: "#06b6d4", end: "#0891b2" }, // Cyan gradient
    { start: "#f97316", end: "#ea580c" }, // Orange gradient
    { start: "#ef4444", end: "#dc2626" }, // Red gradient
  ]

  // Function to get a color from gradient palette
  const getGradientColor = (index: number) => {
    return GRADIENT_COLORS[index % GRADIENT_COLORS.length]
  }

  // Build question counts from filtered responses
  const questionCounts: Record<string, { answers: Record<string, number>; questionType: string; textAnswers: string[] }> = {}
  filteredResponses.forEach((response) => {
    const question = response.questionText
    const answer = response.answer
    const questionType = response.questionType || 'rating'

    if (!questionCounts[question]) {
      questionCounts[question] = { answers: {}, questionType, textAnswers: [] }
    }

    if (questionType === 'text') {
      // For text-type questions, store the actual answers
      if (answer && answer.trim()) {
        questionCounts[question].textAnswers.push(answer)
      }
    } else {
      // For rating-type questions, count the answers
      questionCounts[question].answers[answer] = (questionCounts[question].answers[answer] || 0) + 1
    }
  })

  const barChartData = Object.entries(questionCounts)
    .slice(0, 5)
    .filter(([_, data]) => data.questionType !== 'text')
    .map(([question, data]) => {
      const answers = data.answers
      const total = Object.values(answers).reduce((sum, count) => sum + count, 0)
      return {
        question: question.length > 30 ? question.substring(0, 30) + "..." : question,
        "Strongly Agree": answers["Strongly Agree"] || 0,
        Agree: answers["Agree"] || 0,
        Undecided: answers["Undecided"] || 0,
        Disagree: answers["Disagree"] || 0,
        "Strongly Disagree": answers["Strongly Disagree"] || 0,
        total,
      }
    })


  return (
    <div className="space-y-8">
      {/* Overview Section */}
      <div className="mb-10">
        <div className="flex items-center gap-4 mb-3">
          <div className="h-1.5 w-16 bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"></div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
            Evaluation Analytics
          </h2>
        </div>
        <p className="text-base text-gray-600 ml-[84px] font-medium">Comprehensive analysis of student feedback and responses</p>
      </div>

      {/* Section Tabs */}
      <Card className="bg-white border border-gray-200/60 shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="pb-4 px-7 pt-6">
          <CardTitle className="text-lg font-bold text-gray-900">Filter by Section</CardTitle>
          <CardDescription className="text-sm text-gray-500">Select a category to view questions and results for that section</CardDescription>
        </CardHeader>
        <CardContent className="px-7 pb-6">
          <div className="flex flex-wrap gap-2">
            {availableSections.map((section) => (
              <button
                key={section}
                onClick={() => setSelectedSection(section)}
                className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 border ${selectedSection === section
                  ? "bg-gray-900 text-white border-gray-900 shadow-md"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                  }`}
              >
                {section}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Section Summary Card - Hide for verbal interpretation since it has text responses, not ratings */}
      {selectedSection && selectedSection.toLowerCase() !== "verbal interpretation" && (
        <Card className="bg-white border border-gray-200/60 shadow-sm rounded-xl overflow-hidden">
          <div
            className="h-1.5"
            style={{ backgroundColor: sectionPerformance.ratingColor }}
          ></div>
          <CardContent className="px-7 py-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">{selectedSection}</h3>
                <p className="text-sm text-gray-500 font-medium">
                  {sectionPerformance.total} total responses • {sectionPerformance.positive} positive (Strongly Agree + Agree)
                </p>
              </div>
              <div className="text-right">
                <div
                  className="text-4xl font-bold mb-1"
                  style={{ color: sectionPerformance.ratingColor }}
                >
                  {sectionPerformance.percentage}%
                </div>
                <div
                  className="inline-block px-3 py-1 text-sm font-bold rounded-full"
                  style={{
                    backgroundColor: `${sectionPerformance.ratingColor}15`,
                    color: sectionPerformance.ratingColor
                  }}
                >
                  {sectionPerformance.rating}
                </div>
              </div>
            </div>

            {/* Performance Bar */}
            <div className="mt-4">
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${sectionPerformance.percentage}%`,
                    backgroundColor: sectionPerformance.ratingColor
                  }}
                ></div>
              </div>
            </div>

            {/* Performance Legend */}
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                Excellent (90-100%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Very Good (80-89%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                Good (70-79%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                Satisfactory (60-69%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                Needs Improvement (&lt;60%)
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Question Analysis Section */}
      <div className="space-y-6">
        {Object.entries(questionCounts).map(([question, data], index) => {
          const answers = data.answers
          const questionType = data.questionType
          const textAnswers = data.textAnswers

          const pieData = Object.entries(answers).map(([name, value]) => ({
            name,
            value,
          }))

          // Create bar data sorted by answer type for consistent ordering
          const answerOrder = ["Strongly Agree", "Agree", "Undecided", "Disagree", "Strongly Disagree"]
          const barData = answerOrder
            .filter(answer => answers[answer] && answers[answer] > 0)
            .map((name) => {
              const value = answers[name] || 0
              const color = COLORS[name as keyof typeof COLORS] || "#3b82f6"
              return {
                answer: name,
                count: value,
                fill: color
              }
            })

          const total = questionType === 'text' ? textAnswers.length : Object.values(answers).reduce((sum, count) => sum + count, 0)
          const colors = ['from-blue-500 to-blue-400', 'from-purple-500 to-pink-400', 'from-emerald-500 to-teal-400', 'from-amber-500 to-orange-400', 'from-indigo-500 to-purple-400']
          const colorGradient = colors[index % colors.length]

          return (
            <Card key={index} className="bg-white border border-gray-200/60 shadow-sm rounded-xl overflow-hidden">
              <div className={`h-1.5 bg-gradient-to-r ${colorGradient}`}></div>
              <CardHeader className="pb-6 px-7 pt-7">
                <div className="flex items-start justify-between gap-5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorGradient} flex items-center justify-center text-white text-sm font-bold shadow-sm`}>
                        {index + 1}
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                          Question {index + 1}
                        </CardTitle>
                        <div className="flex items-center gap-2.5">
                          <div className="text-sm font-bold text-gray-600 bg-gray-50 px-3 py-1.5 rounded-md border border-gray-200">
                            {total} responses
                          </div>
                        </div>
                      </div>
                    </div>
                    <CardDescription className="text-lg text-gray-900 leading-relaxed font-semibold mt-3">
                      {question}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-7 pb-7">
                {/* Check if this is a text-type question */}
                {questionType === 'text' ? (
                  /* Text Answers Display for Verbal Interpretation */
                  <div>
                    <h3 className="text-base font-bold text-gray-900 mb-6 flex items-center gap-2.5">
                      <div className="h-1 w-8 bg-gray-300"></div>
                      Student Responses
                    </h3>
                    {textAnswers.length > 0 ? (
                      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                        {textAnswers.map((answer, answerIndex) => (
                          <div
                            key={answerIndex}
                            className="p-4 bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl shadow-sm"
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${colorGradient} flex items-center justify-center text-white text-sm font-bold shadow-sm flex-shrink-0`}>
                                {answerIndex + 1}
                              </div>
                              <div className="flex-1">
                                <p className="text-gray-800 leading-relaxed font-medium">
                                  {answer}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-[200px] text-sm text-gray-400 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-200">
                        <svg className="w-16 h-16 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        <p className="font-semibold text-gray-500">No text responses yet</p>
                        <p className="text-xs text-gray-400 mt-1">Waiting for student responses</p>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Charts Display for Rating Questions */
                  <div className="grid gap-10 lg:grid-cols-2">
                    {/* Pie Chart */}
                    <div>
                      <h3 className="text-base font-bold text-gray-900 mb-6 flex items-center gap-2.5">
                        <div className="h-1 w-8 bg-gray-300"></div>
                        Response Distribution
                      </h3>
                      <ChartContainer
                        config={{
                          "Strongly Agree": {
                            label: "Strongly Agree",
                            color: COLORS["Strongly Agree"],
                          },
                          Agree: {
                            label: "Agree",
                            color: COLORS["Agree"],
                          },
                          Undecided: {
                            label: "Undecided",
                            color: COLORS["Undecided"],
                          },
                          Disagree: {
                            label: "Disagree",
                            color: COLORS["Disagree"],
                          },
                          "Strongly Disagree": {
                            label: "Strongly Disagree",
                            color: COLORS["Strongly Disagree"],
                          },
                        }}
                        className="h-[320px] w-full"
                      >
                        {pieData.length > 0 ? (
                          <PieChart width={350} height={320}>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => {
                                if (percent === undefined || percent < 0.05) return '' // Hide labels for very small slices
                                return `${(percent * 100).toFixed(0)}%`
                              }}
                              innerRadius={60}
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="value"
                              paddingAngle={3}
                              stroke="#ffffff"
                              strokeWidth={3}
                            >
                              {pieData.map((entry, idx) => {
                                const color = COLORS[entry.name as keyof typeof COLORS] || getGradientColor(idx).start
                                return (
                                  <Cell
                                    key={`cell-${idx}`}
                                    fill={color}
                                    style={{
                                      filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.15))',
                                      transition: 'all 0.3s ease'
                                    }}
                                  />
                                )
                              })}
                            </Pie>
                            <ChartTooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0]
                                  const total = pieData.reduce((sum, item) => sum + item.value, 0)
                                  const percentage = total > 0 ? ((data.value as number / total) * 100).toFixed(1) : '0'
                                  return (
                                    <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
                                      <div className="flex items-center gap-3 mb-2">
                                        <div
                                          className="w-4 h-4 rounded-sm"
                                          style={{ backgroundColor: data.payload.fill }}
                                        />
                                        <p className="text-sm font-bold text-gray-900">{data.name}</p>
                                      </div>
                                      <div className="flex items-baseline gap-2">
                                        <p className="text-lg font-bold text-gray-900">{data.value}</p>
                                        <p className="text-sm text-gray-500 font-semibold">({percentage}%)</p>
                                      </div>
                                    </div>
                                  )
                                }
                                return null
                              }}
                            />
                            <Legend
                              verticalAlign="bottom"
                              height={70}
                              wrapperStyle={{ fontSize: '13px', paddingTop: '32px', fontWeight: 700 }}
                              iconType="circle"
                              iconSize={20}
                              formatter={(value, entry) => {
                                const data = pieData.find(item => item.name === value)
                                const total = pieData.reduce((sum, item) => sum + item.value, 0)
                                const percentage = data && total > 0 ? ((data.value / total) * 100).toFixed(1) : '0'
                                const count = data ? data.value : 0
                                // Format: "Agree 1 (100%)"
                                return `${value} ${count} (${percentage}%)`
                              }}
                            />
                          </PieChart>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-[320px] text-sm text-gray-400 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-200">
                            <svg className="w-16 h-16 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                            </svg>
                            <p className="font-semibold text-gray-500">No response data available</p>
                            <p className="text-xs text-gray-400 mt-1">Waiting for student responses</p>
                          </div>
                        )}
                      </ChartContainer>
                    </div>

                    {/* Answer Distribution Bar Chart */}
                    <div>
                      <h3 className="text-base font-bold text-gray-900 mb-6 flex items-center gap-2.5">
                        <div className="h-1 w-8 bg-gray-300"></div>
                        Answer Distribution
                      </h3>
                      {barData.length > 0 ? (
                        <ChartContainer
                          config={barData.reduce((acc, item) => {
                            acc[item.answer] = {
                              label: item.answer,
                              color: item.fill,
                            }
                            return acc
                          }, {} as Record<string, { label: string; color: string }>)}
                          className="h-[320px] w-full"
                        >
                          <BarChart
                            data={barData}
                            margin={{
                              top: 20,
                              right: 20,
                              left: 50,
                              bottom: 50
                            }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#f3f4f6"
                              horizontal={true}
                              vertical={false}
                              strokeWidth={1}
                            />
                            <XAxis
                              dataKey="answer"
                              tick={{ fontSize: 12, fill: '#374151', fontWeight: 600 }}
                              axisLine={{ stroke: '#e5e7eb', strokeWidth: 1 }}
                              tickLine={{ stroke: '#e5e7eb' }}
                              angle={-45}
                              textAnchor="end"
                              height={80}
                              label={{ value: 'Answers', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: '#374151', fontSize: 13, fontWeight: 600 } }}
                            />
                            <YAxis
                              type="number"
                              domain={[0, 'dataMax']}
                              tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 600 }}
                              axisLine={{ stroke: '#e5e7eb', strokeWidth: 1 }}
                              tickLine={{ stroke: '#e5e7eb' }}
                              allowDecimals={false}
                              width={50}
                              label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#374151', fontSize: 13, fontWeight: 600 } }}
                            />
                            <ChartTooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload
                                  return (
                                    <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-md">
                                      <p className="text-sm font-bold text-gray-900 mb-1">{data.answer}</p>
                                      <p className="text-base font-bold text-gray-900">Count: {data.count}</p>
                                    </div>
                                  )
                                }
                                return null
                              }}
                            />
                            <Bar
                              dataKey="count"
                              radius={[6, 6, 0, 0]}
                              minPointSize={2}
                              fill="#3b82f6"
                            >
                              {barData.map((entry, index) => {
                                return (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={entry.fill}
                                  />
                                )
                              })}
                            </Bar>
                          </BarChart>
                        </ChartContainer>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-[320px] text-sm text-gray-400 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-200">
                          <svg className="w-16 h-16 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          <p className="font-semibold text-gray-500">No response data available</p>
                          <p className="text-xs text-gray-400 mt-1">Waiting for student responses</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
