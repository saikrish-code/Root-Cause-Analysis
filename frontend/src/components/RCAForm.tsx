import React, { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { RootState, AppDispatch } from '../store/store'
import { selectDeviation, updateField } from '../store/deviationSlice'
import { selectEvidence } from '../store/evidenceSlice'
import { selectRCA } from '../store/rcaSlice'
import { selectCAPA } from '../store/capaSlice'
import { InvestigationSection } from './InvestigationSection'
import { RootCauseSection } from './RootCauseSection'
import { EvidenceChecklistSection } from './EvidenceChecklistSection'
import { CAPASection } from './CAPASection'

interface CollapsibleSectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  children,
  defaultOpen = true,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  return (
    <div className="border border-white/10 rounded-2xl mb-4 bg-[#1A1A1A] shadow-lg overflow-hidden transition-all">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 text-left font-semibold text-white bg-[#1A1A1A] hover:bg-[#2A2A2A] flex items-center justify-between transition-colors"
      >
        <span className="tracking-wide">{title}</span>
        <span className={`transform transition-transform text-[#D5FF40] ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>
      {isOpen && <div className="p-6 bg-[#1A1A1A] border-t border-white/10">{children}</div>}
    </div>
  )
}

const AIFilledBadge: React.FC = () => (
  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#D5FF40]/10 text-[#D5FF40] border border-[#D5FF40]/30 ml-2">
    AI Suggested
  </span>
)

const UnconfirmedBadge: React.FC = () => (
  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 ml-2">
    Unconfirmed
  </span>
)

export const RCAForm: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const deviation = useSelector((state: RootState) => state.deviation)

  const handleFieldChange = (field: string, value: string | null) => {
    dispatch(updateField({ field: field as any, value }))
  }

  return (
    <div className="p-8 overflow-auto h-full bg-[#0D0D0D]">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white tracking-wide">Investigate Deviation</h2>
        <p className="text-sm text-gray-400 mt-1">Review AI extraction, evidence, investigation, and CAPA actions.</p>
      </div>

      <CollapsibleSection title="1. Deviation & Batch Identification" defaultOpen>
        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
              Deviation Number
            </label>
            <input
              type="text"
              className={`w-full px-4 py-2.5 bg-[#0D0D0D] text-gray-200 rounded-xl text-sm transition-all ${
                deviation.fieldStatus.deviationNumber.isAIFilled
                  ? 'border border-[#D5FF40] ring-1 ring-[#D5FF40]/30'
                  : 'border border-white/10 focus:border-[#D5FF40]'
              }`}
              value={deviation.fields.deviationNumber || ''}
              onChange={(e) => handleFieldChange('deviationNumber', e.target.value)}
              placeholder="Awaiting AI extraction..."
            />
            {deviation.fieldStatus.deviationNumber.isAIFilled && (
              <div className="mt-1.5 flex items-center">
                <AIFilledBadge />
                {!deviation.fieldStatus.deviationNumber.confirmedByUser && <UnconfirmedBadge />}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
              Product Name
            </label>
            <input
              type="text"
              className={`w-full px-4 py-2.5 bg-[#0D0D0D] text-gray-200 rounded-xl text-sm transition-all ${
                deviation.fieldStatus.productName.isAIFilled
                  ? 'border border-[#D5FF40] ring-1 ring-[#D5FF40]/30'
                  : 'border border-white/10 focus:border-[#D5FF40]'
              }`}
              value={deviation.fields.productName || ''}
              onChange={(e) => handleFieldChange('productName', e.target.value)}
              placeholder="Awaiting AI extraction..."
            />
            {deviation.fieldStatus.productName.isAIFilled && (
              <div className="mt-1.5 flex items-center">
                <AIFilledBadge />
                {!deviation.fieldStatus.productName.confirmedByUser && <UnconfirmedBadge />}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
              Batch/Lot Number
            </label>
            <input
              type="text"
              className={`w-full px-4 py-2.5 bg-[#0D0D0D] text-gray-200 rounded-xl text-sm transition-all ${
                deviation.fieldStatus.batchLotNumber.isAIFilled
                  ? 'border border-[#D5FF40] ring-1 ring-[#D5FF40]/30'
                  : 'border border-white/10 focus:border-[#D5FF40]'
              }`}
              value={deviation.fields.batchLotNumber || ''}
              onChange={(e) => handleFieldChange('batchLotNumber', e.target.value)}
              placeholder="Awaiting AI extraction..."
            />
            {deviation.fieldStatus.batchLotNumber.isAIFilled && (
              <div className="mt-1.5 flex items-center">
                <AIFilledBadge />
                {!deviation.fieldStatus.batchLotNumber.confirmedByUser && <UnconfirmedBadge />}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
              Manufacturing Date
            </label>
            <input
              type="date"
              className={`w-full px-4 py-2.5 bg-[#0D0D0D] text-gray-200 rounded-xl text-sm transition-all ${
                deviation.fieldStatus.manufacturingDate.isAIFilled
                  ? 'border border-[#D5FF40] ring-1 ring-[#D5FF40]/30'
                  : 'border border-white/10 focus:border-[#D5FF40]'
              }`}
              value={deviation.fields.manufacturingDate || ''}
              onChange={(e) => handleFieldChange('manufacturingDate', e.target.value)}
            />
            {deviation.fieldStatus.manufacturingDate.isAIFilled && (
              <div className="mt-1.5 flex items-center">
                <AIFilledBadge />
                {!deviation.fieldStatus.manufacturingDate.confirmedByUser && <UnconfirmedBadge />}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
              Detected Date
            </label>
            <input
              type="date"
              className={`w-full px-4 py-2.5 bg-[#0D0D0D] text-gray-200 rounded-xl text-sm transition-all ${
                deviation.fieldStatus.detectedDate.isAIFilled
                  ? 'border border-[#D5FF40] ring-1 ring-[#D5FF40]/30'
                  : 'border border-white/10 focus:border-[#D5FF40]'
              }`}
              value={deviation.fields.detectedDate || ''}
              onChange={(e) => handleFieldChange('detectedDate', e.target.value)}
            />
            {deviation.fieldStatus.detectedDate.isAIFilled && (
              <div className="mt-1.5 flex items-center">
                <AIFilledBadge />
                {!deviation.fieldStatus.detectedDate.confirmedByUser && <UnconfirmedBadge />}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
              Severity
            </label>
            <select
              className={`w-full px-4 py-2.5 bg-[#0D0D0D] text-gray-200 rounded-xl text-sm transition-all ${
                deviation.fieldStatus.severity.isAIFilled
                  ? 'border border-[#D5FF40] ring-1 ring-[#D5FF40]/30'
                  : 'border border-white/10 focus:border-[#D5FF40]'
              }`}
              value={deviation.fields.severity || ''}
              onChange={(e) => handleFieldChange('severity', e.target.value)}
            >
              <option value="" className="bg-[#1A1A1A]">Select severity</option>
              <option value="Critical" className="bg-[#1A1A1A]">Critical</option>
              <option value="Major" className="bg-[#1A1A1A]">Major</option>
              <option value="Minor" className="bg-[#1A1A1A]">Minor</option>
            </select>
            {deviation.fieldStatus.severity.isAIFilled && (
              <div className="mt-1.5 flex items-center">
                <AIFilledBadge />
                {!deviation.fieldStatus.severity.confirmedByUser && <UnconfirmedBadge />}
              </div>
            )}
          </div>
        </div>
        <div className="mt-5">
          <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
            Title
          </label>
          <input
            type="text"
            className={`w-full px-4 py-2.5 bg-[#0D0D0D] text-gray-200 rounded-xl text-sm transition-all ${
              deviation.fieldStatus.title.isAIFilled
                ? 'border border-[#D5FF40] ring-1 ring-[#D5FF40]/30'
                : 'border border-white/10 focus:border-[#D5FF40]'
            }`}
            value={deviation.fields.title || ''}
            onChange={(e) => handleFieldChange('title', e.target.value)}
            placeholder="Awaiting AI extraction..."
          />
          {deviation.fieldStatus.title.isAIFilled && (
            <div className="mt-1.5 flex items-center">
              <AIFilledBadge />
              {!deviation.fieldStatus.title.confirmedByUser && <UnconfirmedBadge />}
            </div>
          )}
        </div>
        <div className="mt-5">
          <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
            Description
          </label>
          <textarea
            className={`w-full px-4 py-2.5 bg-[#0D0D0D] text-gray-200 rounded-xl text-sm transition-all ${
              deviation.fieldStatus.description.isAIFilled
                ? 'border border-[#D5FF40] ring-1 ring-[#D5FF40]/30'
                : 'border border-white/10 focus:border-[#D5FF40]'
            }`}
            rows={4}
            value={deviation.fields.description || ''}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            placeholder="Awaiting AI extraction..."
          />
          {deviation.fieldStatus.description.isAIFilled && (
            <div className="mt-1.5 flex items-center">
              <AIFilledBadge />
              {!deviation.fieldStatus.description.confirmedByUser && <UnconfirmedBadge />}
            </div>
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="2. Facility & Material Impact">
        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
              Site Block
            </label>
            <select
              className={`w-full px-4 py-2.5 bg-[#0D0D0D] text-gray-200 rounded-xl text-sm transition-all ${
                deviation.fieldStatus.siteBlock.isAIFilled
                  ? 'border border-[#D5FF40] ring-1 ring-[#D5FF40]/30'
                  : 'border border-white/10 focus:border-[#D5FF40]'
              }`}
              value={deviation.fields.siteBlock || ''}
              onChange={(e) => handleFieldChange('siteBlock', e.target.value)}
            >
              <option value="" className="bg-[#1A1A1A]">Select site block</option>
              <option value="Manufacturing" className="bg-[#1A1A1A]">Manufacturing</option>
              <option value="Packaging" className="bg-[#1A1A1A]">Packaging</option>
              <option value="QC Lab" className="bg-[#1A1A1A]">QC Lab</option>
              <option value="Warehouse" className="bg-[#1A1A1A]">Warehouse</option>
              <option value="Utilities" className="bg-[#1A1A1A]">Utilities</option>
            </select>
            {deviation.fieldStatus.siteBlock.isAIFilled && (
              <div className="mt-1.5 flex items-center">
                <AIFilledBadge />
                {!deviation.fieldStatus.siteBlock.confirmedByUser && <UnconfirmedBadge />}
              </div>
            )}
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="3. Evidence Checklist">
        <EvidenceChecklistSection />
      </CollapsibleSection>

      <CollapsibleSection title="4. Investigation (5 Whys / Fishbone)">
        <InvestigationSection />
      </CollapsibleSection>

      <CollapsibleSection title="5. Root Cause & Contributing Factors">
        <RootCauseSection />
      </CollapsibleSection>

      <CollapsibleSection title="6. CAPA Recommendations">
        <CAPASection />
      </CollapsibleSection>
    </div>
  )
}
