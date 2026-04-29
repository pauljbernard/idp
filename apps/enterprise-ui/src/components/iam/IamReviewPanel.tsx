import React, { useEffect, useState } from 'react'
import { Award, ShieldCheck, Scale, Waypoints } from 'lucide-react'
import { toast } from 'react-hot-toast'
import {
  idpApi,
  type IamDifferentiationReviewResponse,
  type IamFormalReviewResponse,
  type IamInteroperabilityReviewResponse,
  type IamReviewSummaryResponse,
  type IamStandardsMatrixResponse,
} from '../../services/standaloneApi'

type Props = {
  canManage: boolean
}

function statusClasses(status: 'PASS' | 'WARN' | 'FAIL') {
  switch (status) {
    case 'PASS':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
    case 'FAIL':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200'
    default:
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
  }
}

export function IamReviewPanel({ canManage }: Props) {
  const [summary, setSummary] = useState<IamReviewSummaryResponse | null>(null)
  const [standards, setStandards] = useState<IamStandardsMatrixResponse | null>(null)
  const [interoperability, setInteroperability] = useState<IamInteroperabilityReviewResponse | null>(null)
  const [differentiation, setDifferentiation] = useState<IamDifferentiationReviewResponse | null>(null)
  const [formalReview, setFormalReview] = useState<IamFormalReviewResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const load = async () => {
    setIsLoading(true)
    try {
      const [summaryResponse, standardsResponse, interoperabilityResponse, differentiationResponse, formalResponse] = await Promise.all([
        idpApi.getIamReviewSummary(),
        idpApi.getIamStandardsMatrix(),
        idpApi.getIamInteroperabilityReview(),
        idpApi.getIamDifferentiationReview(),
        idpApi.getIamFormalReview(),
      ])
      setSummary(summaryResponse)
      setStandards(standardsResponse)
      setInteroperability(interoperabilityResponse)
      setDifferentiation(differentiationResponse)
      setFormalReview(formalResponse)
    } catch (error) {
      console.error('Failed to load IAM review workspace', error)
      toast.error('Failed to load IAM review workspace')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const handleRecordReview = async () => {
    setIsSaving(true)
    try {
      await idpApi.recordIamFormalReview({
        notes: [
          'Formal standalone IAM review recorded from the dedicated review workspace.',
          'Subsystem quality is evaluated independently of any downstream application adoption or migration work.',
        ],
      })
      toast.success('Formal IAM review recorded')
      await load()
    } catch (error) {
      console.error('Failed to record IAM formal review', error)
      toast.error('Failed to record IAM formal review')
    } finally {
      setIsSaving(false)
    }
  }

  const latestReview = formalReview?.latest_review ?? null

  return (
    <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Review</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">Standalone Readiness and Market Position</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
            This workspace answers the actual Phase L question: whether the standalone IAM subsystem can honestly be described
            as a production-ready standalone IDP and a credible Keycloak-class competitor, without using any downstream adoption as substitute proof.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRecordReview}
          disabled={!canManage || isSaving}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
        >
          {isSaving ? 'Recording…' : 'Record Formal Review'}
        </button>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400">
          Loading IAM review…
        </div>
      ) : (
        <>
          {!summary?.market_claim_ready && (
            <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
              <div>
                This review workspace is currently reporting modeled internal evidence only. It is useful for remediation tracking, but it is not sufficient for external parity or production-readiness claims.
              </div>
              {summary?.evidence_summary && (
                <div className="text-xs text-amber-800 dark:text-amber-200">{summary.evidence_summary}</div>
              )}
              {summary?.claim_boundary_notes?.length ? (
                <div className="space-y-2">
                  {summary.claim_boundary_notes.map((note) => (
                    <div key={note} className="rounded-lg border border-amber-200/70 bg-white/50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/20 dark:text-amber-100">
                      {note}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard icon={ShieldCheck} label="Standards" value={standards?.overall_status ?? 'UNKNOWN'} detail={`${summary?.standards_matrix_count ?? 0} matrix items`} />
            <SummaryCard icon={Waypoints} label="Interop" value={interoperability?.overall_status ?? 'UNKNOWN'} detail={`${summary?.interoperability_check_count ?? 0} validation checks`} />
            <SummaryCard icon={Award} label="Market Position" value={summary?.latest_market_position?.replace(/_/g, ' ') ?? 'Not reviewed'} detail={summary?.latest_overall_status ?? 'No review recorded'} />
            <SummaryCard icon={Scale} label="Recommendation" value={summary?.latest_adoption_recommendation?.replace(/_/g, ' ') ?? 'Pending'} detail={`${summary?.formal_review_count ?? 0} formal reviews`} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-6">
              <Panel title="Standards Matrix" description="Feature-family review against the standalone full-IDP bar.">
                <div className="mb-4 text-xs text-amber-700 dark:text-amber-300">{standards?.evidence_summary}</div>
                <div className="space-y-3">
                  {standards?.items.map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{item.family}</div>
                          <div className="mt-1 font-medium text-slate-900 dark:text-white">{item.capability}</div>
                          <div className="mt-2 text-slate-600 dark:text-slate-400">{item.summary}</div>
                          <div className="mt-2 text-xs text-amber-700 dark:text-amber-300">{item.evidence_summary}</div>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${statusClasses(item.status)}`}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="Protocol and Interoperability Review" description="Validation-track review across OIDC, OAuth, SAML, organizations, passkeys, authorization, and recovery.">
                <div className="mb-4 text-xs text-amber-700 dark:text-amber-300">{interoperability?.evidence_summary}</div>
                <div className="space-y-3">
                  {interoperability?.checks.map((check) => (
                    <div key={check.id} className="rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{check.protocol_family}</div>
                          <div className="mt-1 font-medium text-slate-900 dark:text-white">{check.name}</div>
                          <div className="mt-2 text-slate-600 dark:text-slate-400">{check.summary}</div>
                          <div className="mt-2 text-xs text-slate-500">{check.evidence}</div>
                          <div className="mt-2 text-xs text-amber-700 dark:text-amber-300">{check.evidence_summary}</div>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${statusClasses(check.status)}`}>
                          {check.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>

            <div className="space-y-6">
              <Panel title="Differentiation Review" description="Where the standalone IAM product is stronger or more opinionated than generic parity alone.">
                <div className="mb-4 text-xs text-amber-700 dark:text-amber-300">{differentiation?.evidence_summary}</div>
                <div className="space-y-3">
                  {differentiation?.areas.map((area) => (
                    <div key={area.id} className="rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-slate-900 dark:text-white">{area.name}</div>
                          <div className="mt-2 text-slate-600 dark:text-slate-400">{area.summary}</div>
                          <div className="mt-2 text-xs text-slate-500">{area.comparative_position}</div>
                          <div className="mt-2 text-xs text-amber-700 dark:text-amber-300">{area.evidence_summary}</div>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${statusClasses(area.status)}`}>
                          {area.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="Formal Review" description="Recorded conclusion on whether the subsystem is standalone-complete, production-ready, Keycloak-competitive, and strategically differentiated.">
                {latestReview ? (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium text-slate-900 dark:text-white">{latestReview.market_position.replace(/_/g, ' ')}</div>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${statusClasses(latestReview.overall_status)}`}>
                          {latestReview.overall_status}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                        Recommendation: <span className="font-medium text-slate-900 dark:text-white">{latestReview.adoption_recommendation.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                        Claim scope: {latestReview.claim_scope.replace(/_/g, ' ')}
                      </div>
                      <div className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                        {formalReview?.evidence_summary}
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <DecisionBadge label="Validation Complete" value={latestReview.standalone_validation_complete} />
                      <DecisionBadge label="Production Ready" value={latestReview.standalone_production_ready} />
                      <DecisionBadge label="Keycloak Competitive" value={latestReview.keycloak_competitive} />
                      <DecisionBadge label="Strategically Differentiated" value={latestReview.strategically_differentiated} />
                    </div>

                    <div className="space-y-2">
                      {formalReview?.claim_boundary_notes?.map((note) => (
                        <div key={note} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                          {note}
                        </div>
                      ))}
                      {latestReview.notes.map((note) => (
                        <div key={note} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
                          {note}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    No formal standalone IAM review has been recorded yet.
                  </div>
                )}
              </Panel>
            </div>
          </div>
        </>
      )}
    </section>
  )
}

function Panel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{description}</p>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  detail: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{value}</div>
        </div>
        <Icon className="h-5 w-5 text-slate-500 dark:text-slate-400" />
      </div>
      <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">{detail}</div>
    </div>
  )
}

function DecisionBadge({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${value ? statusClasses('PASS') : statusClasses('WARN')}`}>
        {value ? 'Yes' : 'No'}
      </div>
    </div>
  )
}
