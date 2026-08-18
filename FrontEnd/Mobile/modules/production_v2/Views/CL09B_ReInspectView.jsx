import { useInspectionFormBase } from '../Controllers/useInspectionFormBase'
import InspectionFormShell from './components/InspectionFormShell'
import FirstSampleReInspectForm from './components/FirstSampleReInspectForm'
import { INSPECT_MODES } from '../constants'

const CL09B_ReInspectView = () => {
  const formState = useInspectionFormBase(INSPECT_MODES.RE_INSPECT)

  return (
    <InspectionFormShell
      title="Kiểm tra lại"
      subTitle="CL09.2: Phiếu kiểm tra lại"
      formState={formState}
      showLastResultButton={true}
    >
      {({ renderImageUploadArea }) => (
        <FirstSampleReInspectForm
          formState={formState}
          renderImageUploadArea={renderImageUploadArea}
        />
      )}
    </InspectionFormShell>
  )
}

export default CL09B_ReInspectView
