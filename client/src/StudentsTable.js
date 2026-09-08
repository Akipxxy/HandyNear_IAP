import { useState, useEffect } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function StudentsTable() {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    course: '',
    year_of_study: '',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/students`).then((res) => {
        if (!res.ok) throw new Error('Failed to fetch students');
        return res.json();
      }),
      fetch(`${API_URL}/api/courses`).then((res) => {
        if (!res.ok) throw new Error('Failed to fetch courses');
        return res.json();
      }),
    ])
      .then(([studentsData, coursesData]) => {
        setStudents(studentsData);
        setCourses(coursesData);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/api/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit');
      }

      const newStudent = await res.json();
      setStudents((prev) => [...prev, newStudent]);

      setFormData({
        name: '',
        email: '',
        course: '',
        year_of_study: '',
      });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p>Loading data...</p>;
  if (error) return <p>Error: {error}</p>;

  const filteredStudents = students.filter((student) =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>Add New Student</h2>
      {formError && <p style={{ color: 'red' }}>{formError}</p>}
      <form onSubmit={handleSubmit} style={{ marginBottom: '30px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <input
          type="text"
          name="name"
          placeholder="Student Name"
          value={formData.name}
          onChange={handleInputChange}
          required
          style={{ padding: '8px' }}
        />
        <input
          type="email"
          name="email"
          placeholder="Email Address"
          value={formData.email}
          onChange={handleInputChange}
          required
          style={{ padding: '8px' }}
        />
        <select
          name="course"
          value={formData.course}
          onChange={handleInputChange}
          required
          style={{ padding: '8px' }}
        >
          <option value="">Select Course</option>
          {courses.map((c) => (
            <option key={c.id} value={c.course_name}>
              {c.course_name}
            </option>
          ))}
        </select>
        <input
          type="number"
          name="year_of_study"
          placeholder="Year of Study"
          min="1"
          max="5"
          value={formData.year_of_study}
          onChange={handleInputChange}
          required
          style={{ padding: '8px', width: '120px' }}
        />
        <button type="submit" disabled={submitting} style={{ padding: '8px 16px', cursor: 'pointer' }}>
          {submitting ? 'Adding...' : 'Add Student'}
        </button>
      </form>

      <h2>Students List</h2>
      <input
        type="text"
        placeholder="Search by student name..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{
          marginBottom: '16px',
          padding: '8px',
          width: '280px',
          fontSize: '14px',
        }}
      />

      <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse', width: '100%', marginBottom: '40px' }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Course</th>
            <th>Year of Study</th>
          </tr>
        </thead>
        <tbody>
          {filteredStudents.length > 0 ? (
            filteredStudents.map((student) => (
              <tr key={student.id}>
                <td>{student.id}</td>
                <td>{student.name}</td>
                <td>{student.email}</td>
                <td>{student.course}</td>
                <td>{student.year_of_study}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" style={{ textAlign: 'center' }}>
                No students match that name.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <h2>Available Courses</h2>
      <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Course Name</th>
            <th>Department</th>
          </tr>
        </thead>
        <tbody>
          {courses.map((course) => (
            <tr key={course.id}>
              <td>{course.id}</td>
              <td>{course.course_name}</td>
              <td>{course.department}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default StudentsTable;