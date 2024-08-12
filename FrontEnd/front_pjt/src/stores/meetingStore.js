import { defineStore } from 'pinia'
import { useErrorStore } from './errorStore';
import axiosInstance from '@/axios'

export const useMeetingStore = defineStore('meeting', {
  state: () => ({
    meetings: [],

  }),
  actions: {
    clearMeetings() {
      this.meetings = [];
    },
    async addMeeting(meeting) {
      try {
        const response = await axiosInstance.post('api/meetings', meeting);
        if (response.data.success) {
          this.meetings.push(meeting);
          this.groupMeetings();
        } else {
          console.error('Failed to add meeting:', response.data.message);
        }
      } catch (error) {
        console.error('Error adding meeting:', error);
      }
    },
    async fetchMeetingById(meetingId) {
      try {
        const response = await axiosInstance.get(`api/meetings/${meetingId}`);
        const meeting = response.data.result;
        if (!this.meetings.find((m) => m.id === meetingId)) {
          this.meetings.push(meeting);
          this.groupMeetings();
        }
      } catch (error) {
        console.error(`Failed to fetch meeting ${meetingId}:`, error);
      }
    },

    async fetchMeetings(teamId, prev = false, next = false) {
      try {
        const today = new Date().toISOString();
        const params = {
          today: today,
          prev: prev,
          next: next,
          teamId: teamId
        };

        const response = await axiosInstance.get('/api/meetings', { params });
        const newMeetings = response.data.result;
    
        console.log('서버로부터 받은 회의 데이터:', newMeetings);
        console.log('현재 store의 groupedMeetings:', this.groupedMeetings)
        const existingMeetingIds = new Set(this.meetings.map(meeting => meeting.id));
        const filteredMeetings = newMeetings.filter(meeting => !existingMeetingIds.has(meeting.id));

        this.meetings.push(...filteredMeetings);
        this.groupMeetings();
      } catch (error) {
        if (error.response && error.response.status !== 404) {
          console.error('Failed to fetch meetings:', error)
        }
      }
    },
    groupMeetings() {
      const today = new Date(); // 현재 시간을 포함한 오늘 날짜
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)); // 자정으로 설정된 오늘의 시작
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)); // 오늘의 끝

      this.groupedMeetings.PREV = this.meetings.filter(meeting => {
        const endDate = new Date(meeting.end_at);
        return endDate < startOfDay;
      });

      this.groupedMeetings.TODAY = this.meetings.filter(meeting => {
        const startDate = new Date(meeting.start_at);
        return startDate >= startOfDay && startDate <= endOfDay;
      });

      this.groupedMeetings.NEXT = this.meetings.filter(meeting => {
        const startDate = new Date(meeting.start_at);
        return startDate > endOfDay;
      });
    }
  },
  getters: {
    getMeetingsByTeamId: (state) => (teamId) => {
      return state.meetings.filter(meeting => meeting.team_id == teamId);
    },
    prevMeetingHoursByTeam: (state) => (teamId) => {
      return state.groupedMeetings.PREV
        .filter(meeting => meeting.team_id == teamId)
        .reduce((total, meeting) => {
          const start = new Date(meeting.start_at);
          const end = new Date(meeting.end_at);
          return total + (end - start) / (1000 * 60 * 60);
        }, 0);
    },
    todayMeetingHours(state) {
      return state.groupedMeetings.TODAY.reduce((total, meeting) => {
        const start = new Date(meeting.start_at);
        const end = new Date(meeting.end_at);
        return total + (end - start) / (1000 * 60 * 60);
      }, 0);
    },
    nextMeetingHours(state) {
      return state.groupedMeetings.NEXT.reduce((total, meeting) => {
        const start = new Date(meeting.start_at);
        const end = new Date(meeting.end_at);
        return total + (end - start) / (1000 * 60 * 60);
      }, 0);
    }
  }
});
