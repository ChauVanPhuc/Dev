import { useInspectionFormBase } from '../Controllers/useInspectionFormBase'
import InspectionFormShell from './components/InspectionFormShell'
import FirstSampleReInspectForm from './components/FirstSampleReInspectForm'
import { INSPECT_MODES } from '../constants'

const CL09A_FirstSampleView = () => {
  const formState = useInspectionFormBase(INSPECT_MODES.FIRST_SAMPLE)

  return (
    <InspectionFormShell
      title="Kiểm tra mẫu lần đầu"
      subTitle="CL09.1: Phiếu kiểm tra mẫu lần đầu"
      formState={formState}
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

export default CL09A_FirstSampleView
