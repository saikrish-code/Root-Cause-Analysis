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
    <div className="border border-gray-200 rounded-lg mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 text-left font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 flex items-center justify-between"
      >
        {title}
        <span className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>
      {isOpen && <div className="p-4">{children}</div>}
    </div>
  )
}

const AIFilledBadge: React.FC = () => (
  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 ml-2">
    AI Suggested
  </span>
)

const UnconfirmedBadge: React.FC = () => (
  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 ml-2">
    Unconfirmed
  </span>
)

export const RCAForm: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const deviation = useSelector((state: RootState) => state.deviation)
  const evidence = useSelector((state: RootState) => state.evidence)
  const rca = useSelector((state: RootState) => state.rca)
  const capa = useSelector((state: RootState) => state.capa)

  const handleFieldChange = (field: string, value: string | null) => {
    dispatch(updateField({ field: field as any, value }))
  }

  return (
    <div className="p-6 overflow-auto h-full bg-gray-50">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Investigate Deviation</h1>

      <CollapsibleSection title="1. Deviation & Batch Identification" defaultOpen>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deviation Number
            </label>
            <input
              type="text"
              className={`w-full px-3 py-2 border rounded-lg ${deviation.fieldStatus.deviationNumber.isAIFilled ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-300'}`}
              value={deviation.fields.deviationNumber || ''}
              onChange={(e) => handleFieldChange('deviationNumber', e.target.value)}
              placeholder="Awaiting AI extraction..."
            />
            {deviation.fieldStatus.deviationNumber.isAIFilled && (
              <div className="mt-1 flex items-center">
                <AIFilledBadge />
                {!deviation.fieldStatus.deviationNumber.confirmedByUser && <UnconfirmedBadge />}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Name
            </label>
            <input
              type="text"
              className={`w-full px-3 py-2 border rounded-lg ${deviation.fieldStatus.productName.isAIFilled ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-300'}`}
              value={deviation.fields.productName || ''}
              onChange={(e) => handleFieldChange('productName', e.target.value)}
              placeholder="Awaiting AI extraction..."
            />
            {deviation.fieldStatus.productName.isAIFilled && (
              <div className="mt-1 flex items-center">
                <AIFilledBadge />
                {!deviation.fieldStatus.productName.confirmedByUser && <UnconfirmedBadge />}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Batch/Lot Number
            </label>
            <input
              type="text"
              className={`w-full px-3 py-2 border rounded-lg ${deviation.fieldStatus.batchLotNumber.isAIFilled ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-300'}`}
              value={deviation.fields.batchLotNumber || ''}
              onChange={(e) => handleFieldChange('batchLotNumber', e.target.value)}
              placeholder="Awaiting AI extraction..."
            />
            {deviation.fieldStatus.batchLotNumber.isAIFilled && (
              <div className="mt-1 flex items-center">
                <AIFilledBadge />
                {!deviation.fieldStatus.batchLotNumber.confirmedByUser && <UnconfirmedBadge />}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Manufacturing Date
            </label>
            <input
              type="date"
              className={`w-full px-3 py-2 border rounded-lg ${deviation.fieldStatus.manufacturingDate.isAIFilled ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-300'}`}
              value={deviation.fields.manufacturingDate || ''}
              onChange={(e) => handleFieldChange('manufacturingDate', e.target.value)}
            />
            {deviation.fieldStatus.manufacturingDate.isAIFilled && (
              <div className="mt-1 flex items-center">
                <AIFilledBadge />
                {!deviation.fieldStatus.manufacturingDate.confirmedByUser && <UnconfirmedBadge />}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Detected Date
            </label>
            <input
              type="date"
              className={`w-full px-3 py-2 border rounded-lg ${deviation.fieldStatus.detectedDate.isAIFilled ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-300'}`}
              value={deviation.fields.detectedDate || ''}
              onChange={(e) => handleFieldChange('detectedDate', e.target.value)}
            />
            {deviation.fieldStatus.detectedDate.isAIFilled && (
              <div className="mt-1 flex items-center">
                <AIFilledBadge />
                {!deviation.fieldStatus.detectedDate.confirmedByUser && <UnconfirmedBadge />}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Severity
            </label>
            <select
              className={`w-full px-3 py-2 border rounded-lg ${deviation.fieldStatus.severity.isAIFilled ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-300'}`}
              value={deviation.fields.severity || ''}
              onChange={(e) => handleFieldChange('severity', e.target.value)}
            >
              <option value="">Select severity</option>
              <option value="Critical">Critical</option>
              <option value="Major">Major</option>
              <option value="Minor">Minor</option>
            </select>
            {deviation.fieldStatus.severity.isAIFilled && (
              <div className="mt-1 flex items-center">
                <AIFilledBadge />
                {!deviation.fieldStatus.severity.confirmedByUser && <UnconfirmedBadge />}
              </div>
            )}
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title
          </label>
          <input
            type="text"
            className={`w-full px-3 py-2 border rounded-lg ${deviation.fieldStatus.title.isAIFilled ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-300'}`}
            value={deviation.fields.title || ''}
            onChange={(e) => handleFieldChange('title', e.target.value)}
            placeholder="Awaiting AI extraction..."
          />
          {deviation.fieldStatus.title.isAIFilled && (
            <div className="mt-1 flex items-center">
              <AIFilledBadge />
              {!deviation.fieldStatus.title.confirmedByUser && <UnconfirmedBadge />}
            </div>
          )}
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            className={`w-full px-3 py-2 border rounded-lg ${deviation.fieldStatus.description.isAIFilled ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-300'}`}
            rows={4}
            value={deviation.fields.description || ''}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            placeholder="Awaiting AI extraction..."
          />
          {deviation.fieldStatus.description.isAIFilled && (
            <div className="mt-1 flex items-center">
              <AIFilledBadge />
              {!deviation.fieldStatus.description.confirmedByUser && <UnconfirmedBadge />}
            </div>
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="2. Facility & Material Impact">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Site Block
            </label>
            <select
              className={`w-full px-3 py-2 border rounded-lg ${deviation.fieldStatus.siteBlock.isAIFilled ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-300'}`}
              value={deviation.fields.siteBlock || ''}
              onChange={(e) => handleFieldChange('siteBlock', e.target.value)}
            >
              <option value="">Select site block</option>
              <option value="Manufacturing">Manufacturing</option>
              <option value="Packaging">Packaging</option>
              <option value="QC Lab">QC Lab</option>
              <option value="Warehouse">Warehouse</option>
              <option value="Utilities">Utilities</option>
            </select>
            {deviation.fieldStatus.siteBlock.isAIFilled && (
              <div className="mt-1 flex items-center">
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
        {capa.actions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            CAPA recommendations will appear after RCA is complete
          </p>
        ) : (
          <div className="space-y-3">
            {capa.actions.map((action) => (
              <div
                key={action.id}
                className={`p-4 rounded-lg border ${
                  action.isAIFilled ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      action.action_type === 'Corrective'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {action.action_type}
                    </span>
                    {action.isAIFilled && <AIFilledBadge />}
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    action.status === 'Proposed' ? 'bg-gray-100 text-gray-800' :
                    action.status === 'Approved' ? 'bg-green-100 text-green-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {action.status}
                  </span>
                </div>
                <p className="text-gray-800 font-medium">{action.description}</p>
                <p className="text-sm text-gray-600 mt-2">{action.rationale}</p>
                {action.owner && (
                  <p className="text-xs text-gray-500 mt-2">Owner: {action.owner}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>
    </div>
  )
}