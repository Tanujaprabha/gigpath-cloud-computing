import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { sidebarSections } from '../../data/mockData'
import { useAppContext } from '../../context/AppContext'
import { getInitials } from '../../utils/formatters'
import Icon from '../ui/Icon'

function isSectionActive(pathname, section) {
  return pathname === section.mainTo || pathname.startsWith(section.basePath)
}

export default function Sidebar({ isOpen, onClose }) {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, logout, goals, profileLoading } = useAppContext()
  const [openSections, setOpenSections] = useState({
    finance: true,
    insights: false,
    goals: false,
    profile: false,
  })

  const handleToggle = (key) => {
    setOpenSections((current) => ({
      ...current,
      [key]: !current[key],
    }))
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className={`app-sidebar ${isOpen ? 'is-open' : ''}`}>
      <div className="app-sidebar__header">
        <div className="app-sidebar__brand">
          <div className="brand-mark">
            <Icon name="spark" size={16} />
          </div>
          <div>
            <strong>GigPath</strong>
            <span>{t('sidebar.growthDashboard', 'Growth dashboard')}</span>
          </div>
        </div>
        <button className="sidebar-close-btn" onClick={onClose} aria-label="Close Menu">
          <Icon name="close" size={20} />
        </button>
      </div>

      <nav className="sidebar-nav" aria-label="Primary navigation">
        {sidebarSections.map((section) => {
          if (!section.children) {
            return (
              <NavLink
                key={section.key}
                to={section.mainTo}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? 'is-active' : ''}`.trim()
                }
                onClick={() => {
                  if (window.innerWidth <= 1024) onClose();
                }}
              >
                <span className="sidebar-link__icon">
                  <Icon name={section.icon} size={18} />
                </span>
                <span>{t(`sidebar.${section.key}`, section.label)}</span>
              </NavLink>
            )
          }

          const active = isSectionActive(location.pathname, section)
          const expanded = openSections[section.key] || active

          return (
            <div key={section.key} className="sidebar-group">
              <div className={`sidebar-link sidebar-link--group ${active ? 'is-active' : ''}`}>
                <NavLink to={section.mainTo} className="sidebar-link__main">
                  <span className="sidebar-link__icon">
                    <Icon name={section.icon} size={18} />
                  </span>
                  <span>{t(`sidebar.${section.key}`)}</span>
                </NavLink>
                <button
                  type="button"
                  className="sidebar-toggle"
                  aria-label={`Toggle ${section.label}`}
                  onClick={() => handleToggle(section.key)}
                >
                  <Icon name={expanded ? 'chevronDown' : 'chevronRight'} size={16} />
                </button>
              </div>

              {expanded ? (
                <div className="sidebar-children">
                  {section.children.map((child) => {
                    let targetTo = child.to
                    
                    // Dynamic logic for Goals
                    if (section.key === 'goals') {
                      const firstGoalId = goals.length > 0 ? goals[0].id : null
                      
                      if (child.label === 'Goal Details') {
                        targetTo = firstGoalId ? `/app/goals/${firstGoalId}` : '/app/goals/new?reason=no-goals'
                      }
                      if (child.label === 'Goal Progress') {
                        targetTo = firstGoalId ? `/app/goals/${firstGoalId}/progress` : '/app/goals/new?reason=no-goals'
                      }
                    }

                    return (
                      <NavLink
                        key={child.to}
                        to={targetTo}
                        className={({ isActive }) =>
                          `sidebar-sublink ${isActive ? 'is-active' : ''}`.trim()
                        }
                        onClick={() => {
                          if (window.innerWidth <= 1024) onClose();
                        }}
                      >
                        {t(`sidebar.${section.key}_${child.label.toLowerCase().replace(/ /g, '_')}`)}
                      </NavLink>
                    )
                  })}
                </div>
              ) : null}
            </div>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="profile-chip">
          {profileLoading ? (
            <div className="profile-chip__loading" style={{ padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              {t('common.loading')}
            </div>
          ) : (
            <>
              <div className="profile-chip__avatar">{getInitials(profile.fullName)}</div>
              <div>
                <strong>{profile.fullName}</strong>
                <span>{profile.workType || profile.email}</span>
              </div>
            </>
          )}
        </div>
        <button type="button" className="button button--ghost button--block" onClick={handleLogout}>
          <Icon name="logout" size={16} />
          <span>{t('sidebar.logout')}</span>
        </button>
      </div>
    </aside>
  )
}
