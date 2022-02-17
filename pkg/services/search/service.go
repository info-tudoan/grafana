package search

import (
	"context"
	"sort"

	"github.com/grafana/grafana/pkg/services/sqlstore"
	"github.com/grafana/grafana/pkg/setting"

	"github.com/grafana/grafana/pkg/bus"
	"github.com/grafana/grafana/pkg/models"
)

func ProvideService(cfg *setting.Cfg, bus bus.Bus, sqlStore sqlstore.Store) *SearchService {
	s := &SearchService{
		Cfg: cfg,
		Bus: bus,
		sortOptions: map[string]sqlstore.SortOption{
			SortAlphaAsc.Name:  SortAlphaAsc,
			SortAlphaDesc.Name: SortAlphaDesc,
		},
		sqlStore: sqlStore,
	}
	s.Bus.AddHandler(s.SearchHandler)
	return s
}

type Query struct {
	Title        string
	Tags         []string
	OrgId        int64
	SignedInUser *models.SignedInUser
	Limit        int64
	Page         int64
	IsStarred    bool
	Type         string
	DashboardIds []int64
	FolderIds    []int64
	Permission   models.PermissionType
	Sort         string

	Result sqlstore.HitList
}

type Service interface {
	SearchHandler(context.Context, *Query) error
	SortOptions() []sqlstore.SortOption
}

type SearchService struct {
	Bus         bus.Bus
	Cfg         *setting.Cfg
	sortOptions map[string]sqlstore.SortOption
	sqlStore    sqlstore.Store
}

func (s *SearchService) SearchHandler(ctx context.Context, query *Query) error {
	dashboardQuery := sqlstore.FindPersistedDashboardsQuery{
		Title:        query.Title,
		SignedInUser: query.SignedInUser,
		IsStarred:    query.IsStarred,
		DashboardIds: query.DashboardIds,
		Type:         query.Type,
		FolderIds:    query.FolderIds,
		Tags:         query.Tags,
		Limit:        query.Limit,
		Page:         query.Page,
		Permission:   query.Permission,
	}

	if sortOpt, exists := s.sortOptions[query.Sort]; exists {
		dashboardQuery.Sort = sortOpt
	}

	if err := s.sqlStore.SearchDashboards(ctx, dashboardQuery); err != nil {
		return err
	}

	hits := dashboardQuery.Result
	if query.Sort == "" {
		hits = sortedHits(hits)
	}

	if err := s.setStarredDashboards(ctx, query.SignedInUser.UserId, hits); err != nil {
		return err
	}

	query.Result = hits

	return nil
}

func sortedHits(unsorted sqlstore.HitList) sqlstore.HitList {
	hits := make(sqlstore.HitList, 0)
	hits = append(hits, unsorted...)

	sort.Sort(hits)

	for _, hit := range hits {
		sort.Strings(hit.Tags)
	}

	return hits
}

func (s *SearchService) setStarredDashboards(ctx context.Context, userID int64, hits []*sqlstore.Hit) error {
	query := models.GetUserStarsQuery{
		UserId: userID,
	}

	if err := s.sqlStore.GetUserStars(ctx, query); err != nil {
		return err
	}

	for _, dashboard := range hits {
		if _, ok := query.Result[dashboard.ID]; ok {
			dashboard.IsStarred = true
		}
	}

	return nil
}
