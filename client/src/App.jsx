import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { DashboardLayout } from './components/DashboardLayout';
import { PageLoader } from './components/PageLoader';
import Home from './pages/Home';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import LessonPresentation from './pages/LessonPresentation';
import QuizPlay from './pages/QuizPlay';
import Cart from './pages/Cart';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import OtpVerify from './pages/OtpVerify';
import MyProfile from './pages/MyProfile';
import Dashboard from './pages/Dashboard';
import HeroManager from './pages/dashboard/HeroManager';
import CourseManager from './pages/dashboard/CourseManager';
import UserManager from './pages/dashboard/UserManager';
import AboutManager from './pages/dashboard/AboutManager';
import Accounting from './pages/dashboard/Accounting';
import QuestionBankManager from './pages/dashboard/QuestionBankManager';
import StudentProgressMonitor from './pages/dashboard/StudentProgressMonitor';
import CouponManager from './pages/dashboard/CouponManager';
import RoyaltyManager from './pages/dashboard/RoyaltyManager';
import CourseTemplateManager from './pages/dashboard/CourseTemplateManager';
import AssignmentSubmit from './pages/AssignmentSubmit';
import CertificateView from './pages/CertificateView';
import CourseStats from './pages/dashboard/CourseStats';
import CategoryManager from './pages/dashboard/CategoryManager';
import TestimonialManager from './pages/dashboard/TestimonialManager';
import ActivityLog from './pages/dashboard/ActivityLog';
import SiteSettingsManager from './pages/dashboard/SiteSettingsManager';
import ContractManager from './pages/dashboard/ContractManager';
import AboutUs from './pages/AboutUs';
import { InfoPage } from './pages/Info';
import { RequireAuth } from './components/RequireAuth';
import { Container } from './components/ui';

export default function App() {
  const { pathname } = useLocation();
  const isLessonPage = /^\/courses\/[^/]+\/lessons\/[^/]+$/.test(pathname);
  const isDashboard = pathname.startsWith('/dashboard');

  const routes = (
    <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/courses/:id" element={<CourseDetail />} />
        <Route path="/courses/:id/lessons/:lessonId" element={<LessonPresentation />} />
        <Route path="/quiz/:quizId" element={<QuizPlay />} />
        <Route
          path="/cart"
          element={
            <RequireAuth roles={['student']}>
              <Cart />
            </RequireAuth>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/otp" element={<OtpVerify />} />

        <Route path="/fitur-pembelajaran" element={<InfoPage type="features" />} />
        <Route path="/quiz-sertifikat" element={<InfoPage type="quiz" />} />
        <Route path="/analitik-pengguna" element={<InfoPage type="analytics" />} />
        <Route path="/faq" element={<InfoPage type="faq" />} />
        <Route path="/kebijakan-privasi" element={<InfoPage type="privacy" />} />
        <Route path="/tentang-kami" element={<AboutUs />} />

        <Route
          path="/my-profile"
          element={
            <RequireAuth>
              <MyProfile />
            </RequireAuth>
          }
        />

        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/heroes"
          element={
            <RequireAuth roles={['admin', 'teacher']}>
              <HeroManager />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/courses"
          element={
            <RequireAuth roles={['admin', 'teacher']}>
              <CourseManager />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/users"
          element={
            <RequireAuth roles={['admin']}>
              <UserManager />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/about"
          element={
            <RequireAuth roles={['admin']}>
              <AboutManager />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/accounting"
          element={
            <RequireAuth roles={['admin']}>
              <Accounting />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/coupons"
          element={
            <RequireAuth roles={['admin']}>
              <CouponManager />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/royalties"
          element={
            <RequireAuth roles={['admin', 'teacher']}>
              <RoyaltyManager />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/course-templates"
          element={
            <RequireAuth roles={['admin']}>
              <CourseTemplateManager />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/question-bank"
          element={
            <RequireAuth roles={['admin', 'teacher']}>
              <QuestionBankManager />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/student-progress"
          element={
            <RequireAuth roles={['admin', 'teacher']}>
              <StudentProgressMonitor />
            </RequireAuth>
          }
        />
        <Route
          path="/certificate/:courseId"
          element={
            <RequireAuth roles={['student']}>
              <CertificateView />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/categories"
          element={
            <RequireAuth roles={['admin']}>
              <CategoryManager />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/testimonials"
          element={
            <RequireAuth roles={['admin']}>
              <TestimonialManager />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/activity-log"
          element={
            <RequireAuth roles={['admin', 'teacher']}>
              <ActivityLog />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/courses/:courseId/stats"
          element={
            <RequireAuth roles={['admin', 'teacher']}>
              <CourseStats />
            </RequireAuth>
          }
        />
        <Route
          path="/assignment/:assignmentId"
          element={
            <RequireAuth roles={['student']}>
              <AssignmentSubmit />
            </RequireAuth>
          }
        />

        <Route
          path="/dashboard/site-settings"
          element={
            <RequireAuth roles={['admin']}>
              <SiteSettingsManager />
            </RequireAuth>
          }
        />

        <Route
          path="/dashboard/contracts"
          element={
            <RequireAuth roles={['admin', 'teacher']}>
              <ContractManager />
            </RequireAuth>
          }
        />

        <Route
          path="*"
          element={
            <Container className="py-20 text-center">
              <h1 className="font-display text-6xl font-extrabold text-gray-200 mb-4">404</h1>
              <p className="text-gray-500 mb-6">Halaman tidak ditemukan.</p>
              <a className="font-semibold text-sm" style={{ color: '#0C628D' }} href="/">Kembali ke Beranda</a>
            </Container>
          }
        />
    </Routes>
  );

  if (isLessonPage) return <>{routes}<PageLoader /></>;

  if (isDashboard) {
    return (
      <RequireAuth>
        <DashboardLayout>{routes}</DashboardLayout>
        <PageLoader />
      </RequireAuth>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">{routes}</main>
      <Footer />
      <PageLoader />
    </div>
  );
}
