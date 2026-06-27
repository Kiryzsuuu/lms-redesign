import { PageSpinner } from '../../components/PageSpinner';
import React, { useState, useEffect } from 'react';
import { Card, Container, Button } from '../../components/ui';
import { useAuth } from '../../lib/auth';

export default function StudentProgressMonitor() {
  const { api } = useAuth();
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetail, setStudentDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/courses/owned');
      setCourses(res.data.courses || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat course');
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async (courseId) => {
    try {
      setLoading(true);
      const res = await api.get(`/reports/course/${courseId}/students`);
      const rows = Array.isArray(res.data.students) ? res.data.students : [];
      const mapped = rows.map((s) => ({
        _id: s.studentId || s._id,
        name: s.name,
        email: s.email,
        isActive: s.isActive,
        isCompleted: s.isCompleted,
        progressPercent: s.progress?.percentage ?? s.progressPercent ?? 0,
        lessonCount: s.progress?.lessonsTotal ?? s.lessonCount ?? 0,
        lessonsCompleted: s.progress?.lessonsCompleted ?? s.lessonsCompleted ?? 0,
      }));
      setStudents(mapped);
      // sync real count into sidebar
      setCourses((prev) => prev.map((c) => c._id === courseId ? { ...c, studentCount: mapped.length } : c));
      setSelectedStudent(null);
      setStudentDetail(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat data siswa');
    } finally {
      setLoading(false);
    }
  };

  const loadStudentDetail = async (courseId, studentId) => {
    try {
      setLoading(true);
      const res = await api.get(`/reports/course/${courseId}/students/${studentId}`);
      const progress = res.data?.progress || {};
      const lessonsCompleted = progress.lessonsCompleted || 0;
      const lessonsTotal = progress.lessonsTotal || 0;
      const overallProgress = lessonsTotal > 0 ? Math.round((lessonsCompleted / lessonsTotal) * 100) : 0;

      setStudentDetail({
        overallProgress,
        completedLessons: lessonsCompleted,
        totalLessons: lessonsTotal,
        lessons: progress.lessons || [],
        quizAttempts: progress.quizzes || [],
        assignmentAttempts: progress.assignments || [],
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat detail siswa');
    } finally {
      setLoading(false);
    }
  };

  const handleCourseSelect = (course) => {
    setSelectedCourse(course);
    loadStudents(course._id);
  };

  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    loadStudentDetail(selectedCourse._id, student._id);
  };

  const getProgressColor = (progress) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 60) return 'bg-yellow-500';
    if (progress >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}><section className="px-6 py-8">
      <div className="w-full">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Monitor Progres Siswa</h1>
            <p className="mt-1 text-sm text-slate-600">Pantau perkembangan dan performa siswa per course</p>
          </div>
        </div>

        {error && (
          <Card className="mb-6 p-4 border-l-4 border-l-red-500 bg-red-50">
            <p className="text-red-700 font-medium">{error}</p>
            <button onClick={() => setError(null)} className="mt-2 text-sm text-red-600 hover:text-red-800">
              Tutup
            </button>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Course Selection */}
          <div className="lg:col-span-1">
            <Card className="p-4">
              <h2 className="font-semibold mb-4 text-slate-900">Pilih Course</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {courses.length === 0 ? (
                  <p className="text-sm text-slate-500">Tidak ada course</p>
                ) : (
                  courses.map((course) => (
                    <button
                      key={course._id}
                      onClick={() => handleCourseSelect(course)}
                      className={`w-full text-left p-3 rounded transition ${
                        selectedCourse?._id === course._id
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-900'
                      }`}
                    >
                      <div className="font-medium text-sm truncate">{course.title}</div>
                      <div className={`text-xs mt-1 ${selectedCourse?._id === course._id ? 'text-blue-100' : 'text-slate-500'}`}>
                        {course.studentCount || 0} siswa
                      </div>
                    </button>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {!selectedCourse ? (
              <Card className="p-12 text-center">
                <p className="text-slate-500">Pilih course untuk melihat progres siswa</p>
              </Card>
            ) : !selectedStudent ? (
              <Card>
                <div className="p-6 border-b border-slate-200">
                  <h2 className="text-xl font-semibold text-slate-900">{selectedCourse.title}</h2>
                  <p className="text-sm text-slate-600 mt-1">Total: {students.length} siswa</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                          Siswa
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                          Progres
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                          Materi
                        </th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="5" className="text-center py-8 text-slate-500">
                            Loading...
                          </td>
                        </tr>
                      ) : students.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="text-center py-8 text-slate-500">
                            Tidak ada siswa
                          </td>
                        </tr>
                      ) : (
                        students.map((student) => (
                          <tr
                            key={student._id}
                            className="border-b border-slate-200 hover:bg-slate-50 transition"
                          >
                            <td className="px-6 py-4">
                              <div className="font-medium text-slate-900">{student.name}</div>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600">{student.email}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${getProgressColor(student.progressPercent || 0)} transition-all`}
                                    style={{ width: `${student.progressPercent || 0}%` }}
                                  />
                                </div>
                                <span className="text-sm font-medium text-slate-900 w-12 text-right">
                                  {Math.round(student.progressPercent || 0)}%
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600">
                              {student.lessonCount || 0} materi
                            </td>
                            <td className="px-6 py-4 text-right">
                              <Button
                                onClick={() => handleStudentSelect(student)}
                                variant="outline"
                                size="sm"
                              >
                                Detail
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            ) : (
              /* Student Detail View */
              <div className="space-y-6">
                {/* Header */}
                <Card className="p-6">
                  <Button onClick={() => setSelectedStudent(null)} variant="outline" size="sm" className="mb-4">
                    ← Kembali
                  </Button>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">{selectedStudent.name}</h2>
                  <p className="text-slate-600">{selectedStudent.email}</p>
                </Card>

                {loading ? (
                  <Card className="p-12 text-center">
                    <PageSpinner />
                  </Card>
                ) : studentDetail ? (
                  <>
                    {/* Progress Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <Card className="p-6">
                        <p className="text-sm text-slate-600 mb-1">Progres Keseluruhan</p>
                        <p className="text-3xl font-bold text-blue-600">
                          {Math.round(studentDetail.overallProgress || 0)}%
                        </p>
                      </Card>
                      <Card className="p-6">
                        <p className="text-sm text-slate-600 mb-1">Materi Selesai</p>
                        <p className="text-3xl font-bold text-green-600">
                          {studentDetail.completedLessons || 0} / {studentDetail.totalLessons || 0}
                        </p>
                      </Card>
                      <Card className="p-6">
                        <p className="text-sm text-slate-600 mb-1">Quiz Tercoba</p>
                        <p className="text-3xl font-bold text-purple-600">
                          {studentDetail.quizAttempts?.length || 0}
                        </p>
                      </Card>
                    </div>

                    {/* Lessons Progress */}
                    {studentDetail.lessons && studentDetail.lessons.length > 0 && (
                      <Card className="p-6">
                        <h3 className="font-semibold mb-4 text-slate-900">Progres Materi</h3>
                        <div className="space-y-3">
                          {studentDetail.lessons.map((lesson, idx) => (
                            <div key={lesson._id} className="border border-slate-200 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <p className="font-medium text-slate-900">
                                    {idx + 1}. {lesson.title}
                                  </p>
                                </div>
                                {lesson.isCompleted ? (
                                  <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-800 rounded">
                                    ✓ Selesai
                                  </span>
                                ) : (
                                  <span className="text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-800 rounded">
                                    Belum
                                  </span>
                                )}
                              </div>
                              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${lesson.isCompleted ? 'bg-green-500' : 'bg-slate-400'}`}
                                  style={{ width: lesson.isCompleted ? '100%' : '0%' }}
                                />
                              </div>
                              {lesson.completedAt && (
                                <p className="text-xs text-slate-600 mt-2">
                                  Selesai: {new Date(lesson.completedAt).toLocaleDateString('id-ID')}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}

                    {/* Quiz Attempts */}
                    {studentDetail.quizAttempts && studentDetail.quizAttempts.length > 0 && (
                      <Card className="p-6">
                        <h3 className="font-semibold mb-4 text-slate-900">Percobaan Quiz</h3>
                        <div className="space-y-3">
                          {studentDetail.quizAttempts.map((attempt, idx) => (
                            <div key={attempt._id} className="border border-slate-200 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <p className="font-medium text-slate-900">Attempt {idx + 1}</p>
                                  <p className="text-sm text-slate-600">
                                    {new Date(attempt.submittedAt).toLocaleString('id-ID')}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-lg">
                                    {attempt.score}/{attempt.maxScore}
                                  </p>
                                  <p className="text-sm text-slate-600">
                                    {Math.round((attempt.score / attempt.maxScore) * 100)}%
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}

                    {/* Assignment Attempts */}
                    {studentDetail.assignmentAttempts && studentDetail.assignmentAttempts.length > 0 && (
                      <Card className="p-6">
                        <h3 className="font-semibold mb-4 text-slate-900">Assignment</h3>
                        <div className="space-y-3">
                          {studentDetail.assignmentAttempts.map((attempt) => (
                            <div key={attempt._id} className="border border-slate-200 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <p className="font-medium text-slate-900">{attempt.assignmentTitle}</p>
                                  <p className="text-sm text-slate-600">
                                    submitted: {new Date(attempt.submittedAt).toLocaleString('id-ID')}
                                  </p>
                                </div>
                                <div className="text-right">
                                  {attempt.grade ? (
                                    <>
                                      <p className="font-bold text-lg">{attempt.score}/{attempt.maxScore}</p>
                                      <p className="text-sm font-medium text-slate-600">Grade: {attempt.grade}</p>
                                    </>
                                  ) : (
                                    <p className="text-sm text-yellow-600 font-medium">Menunggu nilai</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}

                    {/* Empty State */}
                    {(!studentDetail.lessons || studentDetail.lessons.length === 0) &&
                      (!studentDetail.quizAttempts || studentDetail.quizAttempts.length === 0) &&
                      (!studentDetail.assignmentAttempts || studentDetail.assignmentAttempts.length === 0) && (
                        <Card className="p-12 text-center">
                          <div className="text-4xl mb-4 opacity-50">ℹ️</div>
                          <p className="text-slate-500">Siswa ini belum memulai course</p>
                        </Card>
                      )}
                  </>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </section></div>
  );
}
