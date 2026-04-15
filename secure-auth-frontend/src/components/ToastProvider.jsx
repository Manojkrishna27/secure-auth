import { toast, ToastContainer, Flip, Zoom, Slide } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Custom toast config
const toastConfig = {
  position: 'top-right',
  autoClose: 4000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
  theme: 'colored',
  transition: Slide
};

const ToastProvider = ({ children }) => {
  return (
    <>
      {children}
      <ToastContainer
        toastClassName="font-medium"
        bodyClassName="font-medium"
        progressClassName="bg-blue-600"
        {...toastConfig}
      />
    </>
  );
};

// Toast helpers (interview-ready utility functions)
export const showSuccess = (message) => toast.success(message);
export const showError = (message) => toast.error(message);
export const showInfo = (message) => toast.info(message);
export const showWarning = (message) => toast.warning(message);

export default ToastProvider;

