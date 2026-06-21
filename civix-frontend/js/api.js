/* ============================================================
   Civix – API Client (AJAX wrapper)
   ============================================================ */

const Api = (() => {
    const BASE = CivixConfig.API_BASE;

    function getToken() { return localStorage.getItem(CivixConfig.TOKEN_KEY); }

    function buildHeaders(isFormData = false) {
        const headers = {};
        const token = getToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (!isFormData) headers['Content-Type'] = 'application/json';
        return headers;
    }

    async function request(method, endpoint, body = null, isFormData = false) {
        const opts = {
            method,
            headers: buildHeaders(isFormData)
        };
        if (body) {
            opts.body = isFormData ? body : JSON.stringify(body);
        }
        try {
            const res = await fetch(`${BASE}${endpoint}`, opts);

            if (res.status === 401) {
                const refreshed = await tryRefresh();
                if (refreshed) {
                    opts.headers = buildHeaders(isFormData);
                    const retry = await fetch(`${BASE}${endpoint}`, opts);
                    return retry.json();
                } else {
                    Auth.logout(true);
                    return;
                }
            }

            const data = await res.json();
            return data;
        } catch (err) {
            console.error('API Error:', err);
            throw err;
        }
    }

    async function tryRefresh() {
        const refreshToken = localStorage.getItem(CivixConfig.REFRESH_KEY);
        if (!refreshToken) return false;
        try {
            const res = await fetch(`${BASE}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken })
            });
            if (!res.ok) return false;
            const data = await res.json();
            if (data.success && data.data) {
                localStorage.setItem(CivixConfig.TOKEN_KEY, data.data.accessToken);
                localStorage.setItem(CivixConfig.REFRESH_KEY, data.data.refreshToken);
                return true;
            }
        } catch (e) { return false; }
        return false;
    }

    return {
        get:    (ep)           => request('GET',    ep),
        post:   (ep, body)     => request('POST',   ep, body),
        put:    (ep, body)     => request('PUT',    ep, body),
        patch:  (ep, body)     => request('PATCH',  ep, body),
        del:    (ep)           => request('DELETE', ep),
        upload: (ep, formData) => request('POST',   ep, formData, true),

        // Named API calls
        auth: {
            login:    (d) => request('POST', '/auth/login', d),
            register: (d) => request('POST', '/auth/register', d),
            logout:   ()  => request('POST', '/auth/logout'),
            me:       ()  => request('GET',  '/auth/me'),
        },
        dashboard: {
            admin:    (sId) => request('GET', `/dashboard/admin/${sId}`),
            resident: ()    => request('GET', `/dashboard/resident`),
        },
        complaints: {
            categories:   ()        => request('GET',  '/complaints/categories'),
            my:           ()        => request('GET',  '/complaints/my'),
            society:      (sId)     => request('GET',  `/complaints/society/${sId}`),
            get:          (id)      => request('GET',  `/complaints/${id}`),
            submit:       (d)       => request('POST', '/complaints', d),
            submitForm:   (fd)      => request('POST', '/complaints', fd, true),
            updateStatus: (id, d)   => request('PUT',  `/complaints/${id}/status`, d),
        },
        notices: {
            active:  (sId)     => request('GET',    `/notices/society/${sId}`),
            all:     (sId)     => request('GET',    `/notices/society/${sId}/all`),
            get:     (id)      => request('GET',    `/notices/${id}`),
            create:  (sId, d)  => request('POST',   `/notices/society/${sId}`, d),
            update:  (id, d)   => request('PUT',    `/notices/${id}`, d),
            delete:  (id)      => request('DELETE', `/notices/${id}`),
            publish: (id)      => request('PATCH',  `/notices/${id}/publish`),
        },
        maintenance: {
            my:              ()        => request('GET',  '/maintenance/my'),
            society:         (sId)     => request('GET',  `/maintenance/society/${sId}`),
            createCharges:   (sId, d)  => request('POST', `/maintenance/society/${sId}/charges`, d),
            recordPayment:   (d)       => request('POST', '/maintenance/payments', d),
            myPayments:      ()        => request('GET',  '/maintenance/payments/my'),
            societyPayments: (sId)     => request('GET',  `/maintenance/payments/society/${sId}`),
        },
        residents: {
            profile:     ()        => request('GET',  '/residents/profile'),
            updateProfile:(d)      => request('PUT',  '/residents/profile', d),
            all:         (sId)     => request('GET',  `/residents/society/${sId}`),
            get:         (id)      => request('GET',  `/residents/${id}`),
            add:         (sId, d)  => request('POST', `/residents/society/${sId}`, d),
            update:      (id, d)   => request('PUT',  `/residents/${id}`, d),
            deactivate:  (id)      => request('DELETE',`/residents/${id}`),
        }
    };
})();
